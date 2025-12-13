"""Permission checking service."""

from fastapi import HTTPException, Request


def check_permission(request: Request, required_permission: str) -> None:
    """Check if the user has the required permission.

    Args:
        request: FastAPI request with user state
        required_permission: Permission string to check

    Raises:
        HTTPException: If permission is denied
    """
    permissions = getattr(request.state, "permissions", [])

    # Check for wildcard permission
    if "*" in permissions:
        return

    # Check exact match
    if required_permission in permissions:
        return

    # Check wildcard patterns (e.g., "graph:*" matches "graph:entity:read")
    permission_parts = required_permission.split(":")
    for i in range(len(permission_parts)):
        wildcard_pattern = ":".join(permission_parts[: i + 1]) + ":*"
        if wildcard_pattern in permissions:
            return

    raise HTTPException(
        status_code=403,
        detail=f"Permission denied: {required_permission}",
    )


def can_access_data_source(request: Request, data_source: str | None) -> bool:
    """Check if user can access a specific data source.

    Args:
        request: FastAPI request with user state
        data_source: Data source identifier

    Returns:
        True if user can access the data source
    """
    if data_source is None:
        return True

    user_data_sources = getattr(request.state, "data_sources", [])

    # Empty list means access to all
    if not user_data_sources:
        return True

    return data_source in user_data_sources


def can_access_classification(request: Request, classification: str) -> bool:
    """Check if user can access data with a specific classification.

    Args:
        request: FastAPI request with user state
        classification: Data classification level

    Returns:
        True if user can access the classification level
    """
    user_classification = getattr(request.state, "classification", "unclassified")

    classification_levels = {
        "unclassified": 0,
        "cui": 1,
        "confidential": 2,
        "secret": 3,
        "top_secret": 4,
    }

    user_level = classification_levels.get(user_classification.lower(), 0)
    data_level = classification_levels.get(classification.lower(), 0)

    return user_level >= data_level
