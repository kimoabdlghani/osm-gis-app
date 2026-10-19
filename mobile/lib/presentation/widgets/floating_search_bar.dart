// mobile/lib/presentation/widgets/floating_search_bar.dart
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/shapes_repository.dart';

/// Floating Search Bar (Google Maps Style)
class FloatingSearchBar extends StatefulWidget {
  final ShapesRepository repository;
  final Function(LatLng) onLocationSelected;
  final VoidCallback onLocateMe;

  const FloatingSearchBar({
    super.key,
    required this.repository,
    required this.onLocationSelected,
    required this.onLocateMe,
  });

  @override
  State<FloatingSearchBar> createState() => _FloatingSearchBarState();
}

class _FloatingSearchBarState extends State<FloatingSearchBar> {
  final TextEditingController _controller = TextEditingController();
  List<SearchResult> _results = [];
  bool _searching = false;

  void _onSearchChanged(String val) async {
    if (val.trim().length < 3) {
      if (_results.isNotEmpty) setState(() => _results = []);
      return;
    }

    setState(() => _searching = true);
    final list = await widget.repository.searchPlaces(val);
    if (mounted) {
      setState(() {
        _results = list;
        _searching = false;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.cardGlass,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppTheme.borderAccent, width: 1.2),
            boxShadow: const [
              BoxShadow(
                color: Colors.black45,
                blurRadius: 16,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.search, color: AppTheme.primaryLight, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _controller,
                  onChanged: _onSearchChanged,
                  style: const TextStyle(color: AppTheme.textLight, fontSize: 14),
                  decoration: const InputDecoration(
                    hintText: 'Search places or coordinates...',
                    hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 14),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
              if (_controller.text.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.close, size: 18, color: AppTheme.textMuted),
                  onPressed: () {
                    _controller.clear();
                    setState(() => _results = []);
                  },
                ),
              IconButton(
                icon: const Icon(Icons.my_location, color: AppTheme.primaryLight, size: 22),
                tooltip: 'My Location',
                onPressed: widget.onLocateMe,
              ),
            ],
          ),
        ),
        if (_results.isNotEmpty)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.cardSurface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderLight),
              boxShadow: const [
                BoxShadow(color: Colors.black54, blurRadius: 14),
              ],
            ),
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: _results.length,
              separatorBuilder: (_, __) => const Divider(color: AppTheme.borderLight, height: 1),
              itemBuilder: (ctx, idx) {
                final item = _results[idx];
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.location_on, color: AppTheme.primary, size: 20),
                  title: Text(
                    item.displayName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppTheme.textLight, fontSize: 13),
                  ),
                  onTap: () {
                    widget.onLocationSelected(item.location);
                    setState(() => _results = []);
                    _controller.clear();
                    FocusScope.of(context).unfocus();
                  },
                );
              },
            ),
          ),
      ],
    );
  }
}
