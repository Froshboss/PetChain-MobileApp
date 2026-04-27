import React, { useState, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { globalSearch, debouncedSearch, SearchResultItem, SearchCategory } from '../services/searchService';
import { useOfflineStatus } from '../components/OfflineIndicator';

const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pets', label: 'Pets' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'medical_records', label: 'Medical Records' },
];

interface Props {
  onSelectResult?: (item: SearchResultItem) => void;
}

const GlobalSearchScreen: React.FC<Props> = ({ onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const { isOffline } = useOfflineStatus();

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (cancelRef.current) cancelRef.current();
      if (!text.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      cancelRef.current = debouncedSearch(text, category, (res) => {
        setResults(res.items);
        setFromCache(res.fromCache);
        setLoading(false);
      });
    },
    [category],
  );

  const handleCategoryChange = useCallback(
    (newCategory: SearchCategory) => {
      setCategory(newCategory);
      if (query.trim()) {
        setLoading(true);
        globalSearch(query, newCategory).then((res) => {
          setResults(res.items);
          setFromCache(res.fromCache);
          setLoading(false);
        });
      }
    },
    [query],
  );

  const renderItem = ({ item }: { item: SearchResultItem }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onSelectResult?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.category}`}
    >
      <Text style={styles.resultTitle}>{item.title}</Text>
      {item.subtitle ? <Text style={styles.resultSubtitle}>{item.subtitle}</Text> : null}
      <Text style={styles.resultCategory}>{item.category.replace('_', ' ')}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — showing local results</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Search pets, records, appointments…"
        value={query}
        onChangeText={handleQueryChange}
        returnKeyType="search"
        clearButtonMode="while-editing"
        accessibilityLabel="Global search input"
      />

      {/* Category filter tabs */}
      <View style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.tab, category === c.key && styles.tabActive]}
            onPress={() => handleCategoryChange(c.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: category === c.key }}
          >
            <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator style={styles.loader} />}

      {fromCache && !loading && results.length > 0 && (
        <Text style={styles.cacheNote}>Local results — sync when online for full results</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => `${item.category}:${item.id}`}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading && query.trim() ? (
            <Text style={styles.emptyText}>No results for "{query}"</Text>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 12 },
  offlineBanner: { backgroundColor: '#f0ad4e', padding: 8, borderRadius: 6, marginBottom: 8 },
  offlineText: { color: '#fff', textAlign: 'center', fontSize: 12 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  tabs: { flexDirection: 'row', marginBottom: 8 },
  tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 6, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: '#4a90e2' },
  tabText: { fontSize: 13, color: '#555' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  loader: { marginVertical: 16 },
  cacheNote: { fontSize: 11, color: '#999', marginBottom: 4, textAlign: 'center' },
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultTitle: { fontSize: 15, fontWeight: '600' },
  resultSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  resultCategory: { fontSize: 11, color: '#4a90e2', marginTop: 2, textTransform: 'capitalize' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 24 },
});

export default GlobalSearchScreen;
