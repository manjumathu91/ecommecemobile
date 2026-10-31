import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import type { ProductSummary } from '@/types';
import LoadingIndicator from './LoadingIndicator';
import ProductCard from './ProductCard';

interface Props {
  products: ProductSummary[];
  onPressProduct: (p: ProductSummary) => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: React.ReactElement | null;
  empty?: React.ReactElement | null;
}

export default function ProductGrid({ products, onPressProduct, onEndReached, loadingMore, refreshing, onRefresh, header, empty }: Props) {
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      contentContainerStyle={{ padding: 6, flexGrow: 1 }}
      renderItem={({ item, index }) => (
        <View style={{ width: '50%' }}>
          <ProductCard product={item} index={index} onPress={() => onPressProduct(item)} />
        </View>
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListFooterComponent={loadingMore ? <LoadingIndicator fullScreen={false} /> : null}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
    />
  );
}
