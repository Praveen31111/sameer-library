import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Navbar } from '../components/Navbar';
import { Drawer } from '../components/Drawer';
import { useAuth } from '../context/AuthContext';

interface HomeScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  // Interactive seat grid state
  const [selectedSeat, setSelectedSeat] = useState<string | null>('A3'); // A3 selected by default
  const bookedSeats = ['B1', 'B3']; // Mock booked seats

  const scrollViewRef = useRef<ScrollView>(null);

  // Approximate section offsets for scrolling anchors
  const handleDrawerNavigate = (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard', anchor?: string) => {
    if (screen !== 'Home') {
      onNavigate(screen);
      return;
    }

    if (anchor) {
      let scrollY = 0;
      if (anchor === 'features') scrollY = 700;
      if (anchor === 'about') scrollY = 1200;
      if (anchor === 'contact') scrollY = 1650;
      
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
    }
  };

  const handleSeatPress = (seatId: string) => {
    if (bookedSeats.includes(seatId)) {
      Alert.alert('Seat Booked', `Seat ${seatId} is already booked by another student.`);
      return;
    }
    setSelectedSeat(selectedSeat === seatId ? null : seatId);
  };

  return (
    <View style={styles.container}>
      {/* Header Navbar */}
      <Navbar 
        onMenuPress={() => setDrawerVisible(true)} 
        onLogoPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
      />

      {/* Navigation Drawer Overlay */}
      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleDrawerNavigate}
      />

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.lucknowBadge}>
            <Text style={styles.lucknowBadgeText}>✨ Now Open in Lucknow</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Your Perfect{'\n'}
            <Text style={styles.heroTitleTeal}>Study Space</Text>{'\n'}
            Awaits
          </Text>

          <Text style={styles.heroDescription}>
            Book your favorite seat at Sameer Library. Enjoy a peaceful study environment with modern amenities, secure access, and flexible plans.
          </Text>

          <View style={styles.heroButtonsContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              activeOpacity={0.8}
              onPress={() => {
                if (user) {
                  if (user.role === 'ADMIN' || user.role === 'OWNER') {
                    onNavigate('AdminDashboard');
                  } else {
                    onNavigate('StudentDashboard');
                  }
                } else {
                  onNavigate('Register');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Book Your Seat</Text>
              <Ionicons name="chevron-forward-outline" size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 700, animated: true })}
            >
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Book Seat Preview Visual */}
        <View style={styles.previewContainer}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Quick Book</Text>
              <View style={styles.availableBadge}>
                <Text style={styles.availableBadgeText}>Available Now</Text>
              </View>
            </View>

            <View style={styles.pickerPlaceholder}>
              <Text style={styles.pickerLabel}>Branch</Text>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerBoxText}>📍 Sameer Library - Mohanapur</Text>
              </View>
            </View>

            <View style={styles.pickerPlaceholder}>
              <Text style={styles.pickerLabel}>Room</Text>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerBoxText}>🤫 Silent Zone</Text>
              </View>
            </View>

            {/* Dynamic Grid Layout */}
            <View style={styles.seatGridContainer}>
              <Text style={styles.pickerLabel}>Select Seat (Tap to try)</Text>
              <View style={styles.seatGrid}>
                {['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'].map((seat) => {
                  const isBooked = bookedSeats.includes(seat);
                  const isSelected = selectedSeat === seat;

                  return (
                    <TouchableOpacity
                      key={seat}
                      activeOpacity={0.7}
                      onPress={() => handleSeatPress(seat)}
                      style={[
                        styles.seatCell,
                        isBooked && styles.seatBooked,
                        isSelected && styles.seatSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.seatCellText,
                          isBooked && styles.seatTextBooked,
                          isSelected && styles.seatTextSelected,
                        ]}
                      >
                        {seat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Seat Map Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendAvailable]} />
                <Text style={styles.legendLabelText}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendSelected]} />
                <Text style={styles.legendLabelText}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendBooked]} />
                <Text style={styles.legendLabelText}>Booked</Text>
              </View>
            </View>
          </View>

          {/* Floating pricing badge */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>From ₹50/day</Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>2+</Text>
            <Text style={styles.statLabel}>Branches</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>100+</Text>
            <Text style={styles.statLabel}>Seats</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>500+</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Access</Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section} id="features">
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>Features</Text>
            </View>
            <Text style={styles.sectionTitle}>
              Everything You Need to {'\n'}
              <Text style={styles.heroTitleTeal}>Study Smart</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              We've designed our library experience to be seamless, modern, and student-friendly.
            </Text>
          </View>

          {/* Feature Grid List */}
          <View style={styles.featureList}>
            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="calendar" size={24} color="#0d9488" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Easy Seat Booking</Text>
                <Text style={styles.featureDesc}>
                  Select your preferred branch, room, and seat. Book daily, weekly, or monthly plans with just a few taps.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="card" size={24} color="#0d9488" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Secure Online Payment</Text>
                <Text style={styles.featureDesc}>
                  Pay securely via Razorpay integration. Get instant confirmation and digital invoices for all your bookings.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="finger-print" size={24} color="#0d9488" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Fingerprint Attendance</Text>
                <Text style={styles.featureDesc}>
                  Quick check-in and check-out with biometric fingerprint integration. Track your study hours automatically.
                </Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="business" size={24} color="#0d9488" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Multi-Branch Access</Text>
                <Text style={styles.featureDesc}>
                  Access any of our library branches with a single account. Switch study locations easily as per your needs.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, styles.darkerBg]}>
          <Text style={styles.sectionTitle}>About Sameer Library</Text>
          <Text style={styles.aboutText}>
            Our mission is to provide students, researchers, and professional aspirants in Lucknow with a highly focused, peaceful, and fully-equipped study environment.
          </Text>
          <Text style={styles.aboutText}>
            Equipped with ergonomic seating, silent zones, high-speed Wi-Fi, and biometric access tracking, we ensure your preparation times are comfortable and productive.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 Sameer Library. All rights reserved.</Text>
          <Text style={styles.footerSubText}>Designed for Academic Excellence.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // var(--background) Dark Mode
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    textAlign: 'center',
  },
  lucknowBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Amber border capsule
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  lucknowBadgeText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 44,
    letterSpacing: -1,
  },
  heroTitleTeal: {
    color: '#0d9488', // var(--primary) Teal
  },
  heroDescription: {
    fontSize: 15,
    color: '#a3a3a3', // var(--text-secondary)
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  heroButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    width: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#171717',
    borderColor: '#262626',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  previewContainer: {
    position: 'relative',
    marginHorizontal: 20,
    marginBottom: 40,
  },
  previewCard: {
    backgroundColor: '#171717', // var(--surface)
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  availableBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  availableBadgeText: {
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '600',
  },
  pickerPlaceholder: {
    marginBottom: 12,
  },
  pickerLabel: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerBox: {
    backgroundColor: '#262626',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  pickerBoxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  seatGridContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 6,
  },
  seatCell: {
    width: (width - 100) / 5, // Responsive 5-column layout
    height: 40,
    borderColor: '#0d9488',
    borderWidth: 1.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatBooked: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  seatSelected: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  seatCellText: {
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '700',
  },
  seatTextBooked: {
    color: '#ef4444',
  },
  seatTextSelected: {
    color: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendAvailable: {
    borderWidth: 1.5,
    borderColor: '#0d9488',
  },
  legendSelected: {
    backgroundColor: '#0d9488',
  },
  legendBooked: {
    backgroundColor: '#ef4444',
  },
  legendLabelText: {
    color: '#a3a3a3',
    fontSize: 12,
  },
  priceBadge: {
    position: 'absolute',
    bottom: -15,
    right: 15,
    backgroundColor: '#f59e0b', // var(--accent) Amber
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  priceBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#262626',
    paddingVertical: 20,
    marginVertical: 10,
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0d9488',
  },
  statLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  section: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sectionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  sectionBadgeText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '90%',
  },
  featureList: {
    gap: 20,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 16,
    gap: 16,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#a3a3a3',
    lineHeight: 18,
  },
  darkerBg: {
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#262626',
  },
  aboutText: {
    fontSize: 14,
    color: '#a3a3a3',
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    paddingVertical: 30,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    marginTop: 20,
  },
  footerText: {
    color: '#525252',
    fontSize: 12,
  },
  footerSubText: {
    color: '#525252',
    fontSize: 11,
    marginTop: 4,
  },
});
export default HomeScreen;
