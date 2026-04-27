from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .hos_engine import plan_trip


@api_view(["POST"])
def plan_trip_view(request):
    data = request.data

    current_location  = str(data.get("current_location", "")).strip()
    pickup_location   = str(data.get("pickup_location", "")).strip()
    dropoff_location  = str(data.get("dropoff_location", "")).strip()
    raw_cycle         = data.get("current_cycle_used", 0)

    if not current_location:
        return Response({"error": "current_location is required"}, status=status.HTTP_400_BAD_REQUEST)
    if not pickup_location:
        return Response({"error": "pickup_location is required"}, status=status.HTTP_400_BAD_REQUEST)
    if not dropoff_location:
        return Response({"error": "dropoff_location is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        cycle_hours = float(raw_cycle)
    except (TypeError, ValueError):
        return Response({"error": "cycle hours must be a number"}, status=status.HTTP_400_BAD_REQUEST)

    if not (0 <= cycle_hours <= 70):
        return Response({"error": "cycle hours must be 0-70"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = plan_trip(current_location, pickup_location, dropoff_location, cycle_hours)
        return Response(result)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {"error": f"Server error: {str(exc)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
