// mobile/lib/presentation/controllers/gis_controller.dart
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../../domain/models/gis_feature.dart';
import '../../domain/services/geometry_service.dart';
import '../../data/repositories/shapes_repository.dart';

/// Presentation Controller & State Machine for GIS Drawing
/// Single Responsibility: Manages map state, drawing lifecycle, and UI notifications
class GisController extends ChangeNotifier {
  final ShapesRepository repository;

  GisController({required this.repository});

  String _currentLayerId = 'osm';
  String get currentLayerId => _currentLayerId;

  DrawingMode _mode = DrawingMode.none;
  DrawingMode get mode => _mode;

  final List<LatLng> _tempPoints = [];
  List<LatLng> get tempPoints => List.unmodifiable(_tempPoints);

  final List<GisFeature> _features = [];
  List<GisFeature> get features => List.unmodifiable(_features);

  String _liveMetricText = '';
  String get liveMetricText => _liveMetricText;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  /// Load initial shapes from server
  Future<void> loadInitialShapes() async {
    _isLoading = true;
    notifyListeners();

    final loaded = await repository.fetchShapes();
    _features.clear();
    _features.addAll(loaded);

    _isLoading = false;
    notifyListeners();
  }

  /// Change active tile layer
  void switchBaseLayer(String layerId) {
    _currentLayerId = layerId;
    notifyListeners();
  }

  /// Activate or toggle drawing mode
  void setMode(DrawingMode newMode) {
    if (_mode == newMode) {
      cancelDrawing();
    } else {
      _mode = newMode;
      _tempPoints.clear();
      _liveMetricText = '';
      notifyListeners();
    }
  }

  /// Handle map tap based on active drawing mode
  void handleMapTap(LatLng point) {
    if (_mode == DrawingMode.none) return;

    if (_mode == DrawingMode.point) {
      final feature = GisFeature(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: 'Point',
        title: 'Marker (${point.latitude.toStringAsFixed(4)}, ${point.longitude.toStringAsFixed(4)})',
        points: [point],
      );
      _features.add(feature);
      repository.saveShape(feature);
      _mode = DrawingMode.none;
      notifyListeners();
      return;
    }

    _tempPoints.add(point);
    _updateLiveMetrics();
    notifyListeners();
  }

  void _updateLiveMetrics() {
    if (_mode == DrawingMode.line) {
      final meters = GeometryService.calculatePathDistanceMeters(_tempPoints);
      _liveMetricText = 'Length: ${GeometryService.formatDistance(meters)}';
    } else if (_mode == DrawingMode.polygon) {
      final area = GeometryService.calculatePolygonAreaMeters(_tempPoints);
      _liveMetricText = 'Area: ${GeometryService.formatArea(area)}';
    }
  }

  /// Undo the last placed point during active drawing
  bool undoLastPoint() {
    if (_tempPoints.isNotEmpty) {
      _tempPoints.removeLast();
      _updateLiveMetrics();
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Undo the last finished shape
  bool undoLastShape() {
    if (_features.isNotEmpty) {
      _features.removeLast();
      repository.updateAllShapes(_features);
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Finish and persist currently drawn line or polygon
  void finishCurrentShape() {
    if (_mode == DrawingMode.line && _tempPoints.length >= 2) {
      final meters = GeometryService.calculatePathDistanceMeters(_tempPoints);
      final formattedDist = GeometryService.formatDistance(meters);
      final feature = GisFeature(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: 'Line',
        title: 'Path ($formattedDist)',
        points: List.from(_tempPoints),
        distance: formattedDist,
      );
      _features.add(feature);
      repository.saveShape(feature);
    } else if (_mode == DrawingMode.polygon && _tempPoints.length >= 3) {
      final area = GeometryService.calculatePolygonAreaMeters(_tempPoints);
      final formattedArea = GeometryService.formatArea(area);
      final feature = GisFeature(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        type: 'Polygon',
        title: 'Area ($formattedArea)',
        points: List.from(_tempPoints),
        area: formattedArea,
      );
      _features.add(feature);
      repository.saveShape(feature);
    }

    _tempPoints.clear();
    _mode = DrawingMode.none;
    _liveMetricText = '';
    notifyListeners();
  }

  /// Cancel current active drawing mode
  void cancelDrawing() {
    _mode = DrawingMode.none;
    _tempPoints.clear();
    _liveMetricText = '';
    notifyListeners();
  }

  /// Clear all shapes from map and server
  void clearAll() {
    _features.clear();
    _tempPoints.clear();
    _mode = DrawingMode.none;
    _liveMetricText = '';
    repository.updateAllShapes([]);
    notifyListeners();
  }
}
