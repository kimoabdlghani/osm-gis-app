// mobile/lib/core/constants/map_config.dart
import 'package:latlong2/latlong.dart';

/// Static Map Configurations and Tile Layer Sources
/// Single Responsibility: Provides immutable map configuration settings
class MapConfig {
  static const LatLng defaultCenter = LatLng(30.0444, 31.2357); // Cairo, Egypt
  static const double defaultZoom = 13.0;
  static const double minZoom = 3.0;
  static const double maxZoom = 19.0;

  // Base Map Layer Definitions
  static const Map<String, MapLayerDef> layers = {
    'osm': MapLayerDef(
      id: 'osm',
      label: 'Default Streets',
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19.0,
      subdomains: [],
    ),
    'satellite': MapLayerDef(
      id: 'satellite',
      label: 'Satellite Imagery',
      urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maxZoom: 19.0,
      subdomains: [],
    ),
    'dark': MapLayerDef(
      id: 'dark',
      label: 'Dark Mode',
      urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      maxZoom: 20.0,
      subdomains: ['a', 'b', 'c', 'd'],
    ),
    'topo': MapLayerDef(
      id: 'topo',
      label: 'Topographic',
      urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      maxZoom: 17.0,
      subdomains: ['a', 'b', 'c'],
    ),
  };

  // Node.js Backend API Config (Change host for emulator or physical device)
  static const String defaultApiBaseUrl = 'http://10.0.2.2:3000'; // Android emulator localhost
  static const String nominatimSearchUrl = 'https://nominatim.openstreetmap.org/search';
}

/// Metadata model for a map tile layer
class MapLayerDef {
  final String id;
  final String label;
  final String urlTemplate;
  final double maxZoom;
  final List<String> subdomains;

  const MapLayerDef({
    required this.id,
    required this.label,
    required this.urlTemplate,
    required this.maxZoom,
    required this.subdomains,
  });
}
