// mobile/lib/domain/services/geometry_service.dart
import 'dart:math' as math;
import 'package:latlong2/latlong.dart';

/// Pure GIS Geometry and Geodesic Calculation Service
/// Single Responsibility: Implements distance and area spatial algorithms
class GeometryService {
  static const Distance _distanceCalculator = Distance();
  static const double _earthRadiusMeters = 6378137.0;

  /// Calculate cumulative geodesic distance of a path in meters
  static double calculatePathDistanceMeters(List<LatLng> points) {
    if (points.length < 2) return 0.0;
    double total = 0.0;
    for (int i = 0; i < points.length - 1; i++) {
      total += _distanceCalculator.as(LengthUnit.Meter, points[i], points[i + 1]);
    }
    return total;
  }

  /// Format distance into readable metric units (m or km)
  static String formatDistance(double meters) {
    if (meters <= 0) return '0 m';
    if (meters >= 1000) {
      return '${(meters / 1000).toStringAsFixed(2)} km';
    }
    return '${meters.toStringAsFixed(1)} m';
  }

  /// Calculate spherical excess polygon area in square meters
  static double calculatePolygonAreaMeters(List<LatLng> points) {
    if (points.length < 3) return 0.0;

    double total = 0.0;
    final int count = points.length;

    for (int i = 0; i < count; i++) {
      final p1 = points[i];
      final p2 = points[(i + 1) % count];

      final double lon1 = p1.longitude * (math.pi / 180.0);
      final double lat1 = p1.latitude * (math.pi / 180.0);
      final double lon2 = p2.longitude * (math.pi / 180.0);
      final double lat2 = p2.latitude * (math.pi / 180.0);

      total += (lon2 - lon1) * (2.0 + math.sin(lat1) + math.sin(lat2));
    }

    total = total * _earthRadiusMeters * _earthRadiusMeters / 2.0;
    return total.abs();
  }

  /// Format area into readable metric units (m² or km²)
  static String formatArea(double squareMeters) {
    if (squareMeters <= 0) return '0 m²';
    if (squareMeters >= 1000000) {
      return '${(squareMeters / 1000000).toStringAsFixed(2)} km²';
    }
    return '${squareMeters.toStringAsFixed(1)} m²';
  }
}
