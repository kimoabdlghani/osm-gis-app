// mobile/lib/data/repositories/shapes_repository.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../../core/constants/map_config.dart';
import '../../domain/models/gis_feature.dart';

/// REST API Client for GIS Server and OpenStreetMap Nominatim
/// Single Responsibility: Network calls and JSON data serialization
class ShapesRepository {
  final String baseUrl;
  final http.Client _client;

  ShapesRepository({
    this.baseUrl = MapConfig.defaultApiBaseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  /// Fetch all saved features from Node.js backend
  Future<List<GisFeature>> fetchShapes() async {
    try {
      final uri = Uri.parse('$baseUrl/api/shapes');
      final res = await _client.get(uri).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final List<dynamic> data = jsonDecode(res.body);
        return data.map((item) => GisFeature.fromJson(item)).toList();
      }
    } catch (e) {
      // Return empty list on network error (offline resilience)
    }
    return [];
  }

  /// Save newly drawn feature to backend
  Future<bool> saveShape(GisFeature feature) async {
    try {
      final uri = Uri.parse('$baseUrl/api/shapes');
      final res = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(feature.toJson()),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  /// Sync/Replace all features on server (used on delete/undo)
  Future<bool> updateAllShapes(List<GisFeature> features) async {
    try {
      final uri = Uri.parse('$baseUrl/api/shapes');
      final res = await _client.put(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(features.map((f) => f.toJson()).toList()),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Search places via OpenStreetMap Nominatim API
  Future<List<SearchResult>> searchPlaces(String query) async {
    if (query.trim().isEmpty) return [];

    try {
      final uri = Uri.parse(
        '${MapConfig.nominatimSearchUrl}?format=json&q=${Uri.encodeComponent(query)}&limit=5&addressdetails=1',
      );
      final res = await _client.get(uri, headers: {
        'Accept-Language': 'en',
        'User-Agent': 'MapStudio-Flutter-GIS/1.0',
      }).timeout(const Duration(seconds: 5));

      if (res.statusCode == 200) {
        final List<dynamic> list = jsonDecode(res.body);
        return list.map((item) {
          return SearchResult(
            displayName: item['display_name'] ?? 'Unknown location',
            location: LatLng(
              double.parse(item['lat']),
              double.parse(item['lon']),
            ),
          );
        }).toList();
      }
    } catch (_) {}
    return [];
  }

  void dispose() {
    _client.close();
  }
}

/// Geocoding search result item
class SearchResult {
  final String displayName;
  final LatLng location;

  const SearchResult({
    required this.displayName,
    required this.location,
  });
}
