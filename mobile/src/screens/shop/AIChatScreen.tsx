

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import api, { ApiError } from '@/api/client';
import { catalogApi, orderApi } from '@/api/services';
import { useCart } from '@/context/CartContext';
import { useNav } from '@/navigation/hooks';
import type { ProductSummary } from '@/types';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  products?: ProductSummary[];
};

type AIChatResponse = {
  success: boolean;
  reply: string;
};

const isProductSearch = (message: string) =>
  /\b(show|find|search|looking for|buy|product|products|phone|mobile|laptop|computer|shoes|watch|dress|shirt|headphone|earphone|camera|tablet)\b|வேண்டும்|காட்டு|பொருள்|மொபைல்|போன்/i.test(message);

export default function AIChatScreen() {
  const nav = useNav();
  const { add } = useCart();

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! Welcome to Velora AI. 🌿\n\nI can help you find products, add items to your cart, view orders and track your order. How can I help you?',
      sender: 'ai',
    },
  ]);

  const addProductToCart = async (product: ProductSummary) => {
    const success = await add(product.id, 1);

    if (success) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-cart`,
          text: `${product.name} has been added to your cart successfully! 🛒`,
          sender: 'ai',
        },
      ]);
    }
  };

  const openCart = () => {
    nav.navigate('Tabs', { screen: 'Cart' });
  };

  const openMyOrders = () => {
    nav.navigate('OrderList');
  };

  const trackOrder = async () => {
    try {
      const response = await orderApi.list();
      const orders = response.results;

      if (!orders || orders.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-orders`,
            text: 'You have no orders yet. Place an order first to track it.',
            sender: 'ai',
          },
        ]);
        return;
      }

      if (orders.length === 1) {
        nav.navigate('OrderTracking', { id: orders[0].id });
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-track`,
          text: 'You have multiple orders. Please select an order from My Orders to track it.',
          sender: 'ai',
        },
      ]);

      nav.navigate('OrderList');
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-track-error`,
          text: error instanceof Error
            ? error.message
            : 'Could not load your orders. Please try again.',
          sender: 'ai',
        },
      ]);
    }
  };

  const sendMessage = async () => {
    const userMessage = message.trim();

    if (!userMessage || loading) return;

    const userChat: Message = {
      id: Date.now().toString(),
      text: userMessage,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userChat]);
    setMessage('');
    setLoading(true);

    try {
      const lowerMessage = userMessage.toLowerCase();

      // Cart navigation
      if (
        /\b(view cart|open cart|my cart|go to cart|show cart)\b|cart காட்டு|cart திற/i.test(lowerMessage)
      ) {
        openCart();
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-cart-open`,
            text: 'Opening your shopping cart. 🛒',
            sender: 'ai',
          },
        ]);
        return;
      }

      // My Orders navigation
      if (
        /\b(my orders|view orders|order history|show orders)\b|என் ஆர்டர்/i.test(lowerMessage)
      ) {
        openMyOrders();
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-orders-open`,
            text: 'Opening your orders.',
            sender: 'ai',
          },
        ]);
        return;
      }

      // Track order
      if (/\b(track order|track my order|order tracking|track shipment)\b|order track/i.test(lowerMessage)) {
        await trackOrder();
        return;
      }

      // Search real products from the backend
      let products: ProductSummary[] = [];

      if (isProductSearch(userMessage)) {
        const productResponse = await catalogApi.products({
          search: userMessage,
          in_stock: true,
        });

        products = productResponse.results ?? [];
      }

      // Get AI response
      const response = await api.post<AIChatResponse>(
        '/ai/chat/',
        { message: userMessage },
        { timeout: 60000 },
      );

      if (!response.data.success || !response.data.reply) {
        throw new Error('AI response was empty. Please try again.');
      }

      let reply = response.data.reply;

      if (isProductSearch(userMessage)) {
        if (products.length > 0) {
          reply += '\n\nHere are the matching products available in our store:';
        } else {
          reply += '\n\nI could not find matching in-stock products in our store. Try another product name.';
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          text: reply,
          sender: 'ai',
          products,
        },
      ]);
    } catch (error) {
      let errorMessage = 'Something went wrong. Please try again.';

      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          text: `Sorry! ${errorMessage}`,
          sender: 'ai',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.botIcon}>
          <MaterialCommunityIcons
            name="robot"
            size={28}
            color="#FFFFFF"
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Velora AI Assistant</Text>
          <Text style={styles.online}>
            ● {loading ? 'Thinking...' : 'Online'}
          </Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <View
            style={[
              styles.message,
              item.sender === 'user'
                ? styles.userMessage
                : styles.aiMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                item.sender === 'user' && styles.userText,
              ]}
            >
              {item.text}
            </Text>

            {item.products && item.products.length > 0 && (
              <View style={styles.productsContainer}>
                {item.products.map((product) => (
                  <View key={product.id} style={styles.productCard}>
                    <Text style={styles.productName}>
                      {product.name}
                    </Text>

                    <Text style={styles.productCategory}>
                      {product.category_name}
                    </Text>

                    <Text style={styles.productPrice}>
                      ₹{product.effective_price}
                    </Text>

                    <Text style={styles.stockText}>
                      {product.in_stock
                        ? `In stock (${product.stock} available)`
                        : 'Out of stock'}
                    </Text>

                    <View style={styles.productActions}>
                      <Pressable
                        style={styles.detailButton}
                        onPress={() =>
                          nav.navigate('ProductDetail', {
                            id: product.id,
                          })
                        }
                      >
                        <Text style={styles.detailButtonText}>
                          View Product
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.addButton}
                        disabled={!product.in_stock}
                        onPress={() => addProductToCart(product)}
                      >
                        <MaterialCommunityIcons
                          name="cart-plus"
                          size={17}
                          color="#FFFFFF"
                        />
                        <Text style={styles.addButtonText}>
                          Add to Cart
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#035641" size="small" />
          <Text style={styles.loadingText}>
            Velora AI is thinking...
          </Text>
        </View>
      )}

      <View style={styles.quickActions}>
        <Pressable style={styles.quickButton} onPress={openCart}>
          <MaterialCommunityIcons name="cart" size={17} color="#035641" />
          <Text style={styles.quickButtonText}>My Cart</Text>
        </Pressable>

        <Pressable style={styles.quickButton} onPress={openMyOrders}>
          <MaterialCommunityIcons name="package-variant" size={17} color="#035641" />
          <Text style={styles.quickButtonText}>My Orders</Text>
        </Pressable>

        <Pressable style={styles.quickButton} onPress={trackOrder}>
          <MaterialCommunityIcons name="truck-delivery" size={17} color="#035641" />
          <Text style={styles.quickButtonText}>Track Order</Text>
        </Pressable>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask about products or orders..."
          placeholderTextColor="#888888"
          value={message}
          onChangeText={setMessage}
          multiline
          editable={!loading}
          maxLength={2000}
        />

        <Pressable
          style={[
            styles.sendButton,
            (loading || !message.trim()) && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={loading || !message.trim()}
        >
          <MaterialCommunityIcons
            name="send"
            size={23}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFAF2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#035641',
    gap: 12,
  },
  botIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#058764',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  online: {
    color: '#C7F5DD',
    fontSize: 16,
    marginTop: 4,
  },
  chatContent: {
    padding: 16,
    flexGrow: 1,
  },
  message: {
    maxWidth: '90%',
    padding: 13,
    borderRadius: 16,
    marginBottom: 12,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#035641',
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: '#26352E',
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  productsContainer: {
    marginTop: 12,
    gap: 10,
  },
  productCard: {
    backgroundColor: '#FCFAF2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E9E3',
  },
  productName: {
    color: '#26352E',
    fontSize: 19,
    fontWeight: '800',
  },
  productCategory: {
    color: '#777777',
    fontSize: 18,
    marginTop: 4,
  },
  productPrice: {
    color: '#035641',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 8,
  },
  stockText: {
    color: '#058764',
    fontSize: 16,
    marginTop: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  detailButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#035641',
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#035641',
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#035641',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E9E3',
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 7,
  },
  quickButtonText: {
    color: '#035641',
    fontSize: 16,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E9E3',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 100,
    backgroundColor: '#F3F6F1',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#26352E',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#035641',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#035641',
  },
});
