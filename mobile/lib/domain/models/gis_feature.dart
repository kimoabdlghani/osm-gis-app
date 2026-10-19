// mobile/lib/domain/models/gis_feature.dart
import 'package:latlong2/latlong.dart';

/// Supported GIS Drawing Tool Modes
enum DrawingMode { none, point, line, polygon }

/// Base GIS Feature Model
/// Represents a geographical vector shape on the map
class GisFeature {
  final String id;
  final String type; // 'Point', 'Line', 'Polygon'
  final String title;
  final List<LatLng> points;
  final String? distance;
  final String? area;
  final String? perimeter;

  const GisFeature({
    required this.id,
    required this.type,
    required this.title,
    required this.points,
    this.distance,
    this.area,
    this.perimeter,
  });

  /// Convert backend JSON to GisFeature
  factory GisFeature.fromJson(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? 'Point';
    final title = json['title'] as String? ?? 'Unnamed Feature';
    final List<LatLng> parsedPoints = [];

    final rawCoords = json['coordinates'];
    if (rawCoords is List) {
      if (type == 'Point' && rawCoords.length >= 2) {
        parsedPoints.add(LatLng(
          (rawCoords[0] as num).toDouble(),
          (rawCoords[1] as num).toDouble(),
        ));
      } else if (type == 'Line' || type == 'Polygon') {
        for (final item in rawCoords) {
          if (item is List && item.length >= 2) {
            parsedPoints.add(LatLng(
              (item[0] as num).toDouble(),
              (item[1] as num).toDouble(),
            ));
          }
        }
      }
    }

    return GisFeature(
      id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      type: type,
      title: title,
      points: parsedPoints,
      distance: json['distance'] as String?,
      area: json['area'] as String?,
      perimeter: json['perimeter'] as String?,
    );
  }

  /// Serialize to JSON compatible with Node.js backend
  Map<String, dynamic> toJson() {
    dynamic coords;
    if (type == 'Point' && points.isNotEmpty) {
      coords = [points.first.latitude, points.first.longitude];
    } else {
      coords = points.map((p) => [p.latitude, p.longitude]).toList();
    }

    return {
      'type': type,
      'title': title,
      'coordinates': coords,
      if (distance != null) 'distance': distance,
      if (area != null) 'area': area,
      if (perimeter != null) 'perimeter': perimeter,
    };
  }
}
