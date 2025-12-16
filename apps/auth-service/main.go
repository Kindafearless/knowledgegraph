package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/knowledgegraph/auth-service/internal/config"
	"github.com/knowledgegraph/auth-service/internal/handlers"
	"github.com/knowledgegraph/auth-service/internal/middleware"
	"github.com/knowledgegraph/auth-service/internal/repository"
	"github.com/knowledgegraph/auth-service/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize database connection
	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize Redis
	redisClient, err := repository.NewRedisClient(cfg.RedisURL)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", zap.Error(err))
	}
	defer redisClient.Close()

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	permissionRepo := repository.NewPermissionRepository(db)
	sessionRepo := repository.NewSessionRepository(redisClient)

	// Initialize auth provider based on mode
	var authProvider services.AuthProvider
	if cfg.LocalMode {
		logger.Info("Running in LOCAL MODE - using database authentication")
		authProvider = services.NewLocalAuthProvider(db)
	} else {
		cognitoService, err := services.NewCognitoService(cfg)
		if err != nil {
			logger.Fatal("Failed to initialize Cognito service", zap.Error(err))
		}
		authProvider = cognitoService
	}

	authService := services.NewAuthService(
		authProvider,
		userRepo,
		permissionRepo,
		sessionRepo,
		cfg,
		logger,
	)

	rbacService := services.NewRBACService(permissionRepo, logger)
	abacService := services.NewABACService(permissionRepo, logger)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, logger)
	permissionHandler := handlers.NewPermissionHandler(rbacService, abacService, logger)
	healthHandler := handlers.NewHealthHandler(db, redisClient)

	// Setup Gin router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS(cfg.CORSOrigins))
	router.Use(middleware.SecurityHeaders())

	// Health check endpoints
	router.GET("/health", healthHandler.Health)
	router.GET("/ready", healthHandler.Ready)

	// API routes
	api := router.Group("/api/v1")
	{
		// Public auth endpoints
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.GET("/callback", authHandler.OAuthCallback)
		}

		// Protected endpoints
		protected := api.Group("")
		protected.Use(middleware.Auth(authService))
		{
			// User info
			protected.GET("/me", authHandler.GetCurrentUser)
			protected.PUT("/me", authHandler.UpdateCurrentUser)

			// Permission checks
			protected.POST("/permissions/check", permissionHandler.CheckPermission)
			protected.POST("/permissions/check-batch", permissionHandler.CheckPermissionBatch)

			// Admin endpoints (require admin role)
			admin := protected.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				admin.GET("/users", authHandler.ListUsers)
				admin.GET("/users/:id", authHandler.GetUser)
				admin.PUT("/users/:id/roles", authHandler.UpdateUserRoles)
				admin.GET("/roles", permissionHandler.ListRoles)
				admin.POST("/roles", permissionHandler.CreateRole)
				admin.PUT("/roles/:id", permissionHandler.UpdateRole)
				admin.DELETE("/roles/:id", permissionHandler.DeleteRole)
				admin.GET("/policies", permissionHandler.ListPolicies)
				admin.POST("/policies", permissionHandler.CreatePolicy)
			}
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting auth service", zap.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited properly")
}
