import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Dimensions, Image, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Navbar } from '../components/Navbar';
import { Drawer } from '../components/Drawer';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { COLORS } from '../utils/constants';

interface HomeScreenProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomNavTab>('Home');
  
  // Dynamic Branches from Database
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);

  // Fetch real libraries dynamically from DB
  useEffect(() => {
    const fetchRealBranches = async () => {
      try {
        const res = await apiRequest('/branches');
        if (res?.branches && Array.isArray(res.branches)) {
          setBranches(res.branches);
        }
      } catch (err: any) {
        console.warn('Failed to load branches on HomeScreen:', err?.message || err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchRealBranches();
  }, []);

  // Interactive seat grid state
  const [selectedSeat, setSelectedSeat] = useState<string | null>('B1');
  const bookedSeats = ['A3', 'A4', 'C1', 'C2', 'D3', 'D4'];

  const scrollViewRef = useRef<ScrollView>(null);

  const handleDrawerNavigate = (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard', anchor?: string) => {
    if (screen !== 'Home') {
      onNavigate(screen);
      return;
    }

    if (anchor) {
      let scrollY = 0;
      if (anchor === 'features') scrollY = 750;
      if (anchor === 'about') scrollY = 1350;
      if (anchor === 'contact') scrollY = 1850;
      
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
    }
  };

  const handleBottomTabPress = (tab: BottomNavTab) => {
    setActiveBottomTab(tab);
    if (tab === 'Home') {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else if (tab === 'Book') {
      if (user) {
        onNavigate(user.role === 'ADMIN' || user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
      } else {
        onNavigate('Register');
      }
    } else if (tab === 'My Bookings') {
      if (user) {
        onNavigate('StudentDashboard');
      } else {
        onNavigate('Login');
      }
    } else if (tab === 'Profile') {
      if (user) {
        onNavigate(user.role === 'ADMIN' || user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
      } else {
        onNavigate('Login');
      }
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
      {/* Top Header Navbar */}
      <Navbar 
        onMenuPress={() => setDrawerVisible(true)} 
        onLogoPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
        onNotificationPress={() => {
          if (user) {
            Alert.alert('Notifications', 'You have no new notifications at this time.');
          } else {
            onNavigate('Login');
          }
        }}
        onProfilePress={() => {
          if (user) {
            onNavigate(user.role === 'ADMIN' || user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
          } else {
            onNavigate('Login');
          }
        }}
      />

      {/* Navigation Drawer Overlay */}
      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleDrawerNavigate}
      />

      <ScrollView 
        ref={scrollViewRef} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Available Seats Near You</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Find Your Perfect Space for{' '}
            <Text style={styles.heroTitleTeal}>Deep Work.</Text>
          </Text>

          <Text style={styles.heroDescription}>
            Book quiet, comfortable library seats instantly. Focus on what matters, we'll handle the space.
          </Text>

          <View style={styles.heroButtonsContainer}>
            <TouchableOpacity 
              style={styles.primaryButton}
              activeOpacity={0.85}
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
              <Text style={styles.primaryButtonText}>Book a Seat</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={() => scrollViewRef.current?.scrollTo({ y: 550, animated: true })}
            >
              <Text style={styles.secondaryButtonText}>Explore Libraries</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Bento */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.85}
            onPress={() => Alert.alert('Digital Pass', 'Scan QR at library gate for automated entry.')}
          >
            <View style={styles.quickActionIconContainer}>
              <Ionicons name="qr-code-outline" size={24} color={COLORS.onSecondaryContainer} />
            </View>
            <Text style={styles.quickActionTitle}>Scan to Enter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            activeOpacity={0.85}
            onPress={() => scrollViewRef.current?.scrollTo({ y: 550, animated: true })}
          >
            <View style={[styles.quickActionIconContainer, { backgroundColor: COLORS.surfaceContainerLow }]}>
              <Ionicons name="map-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickActionTitle}>Map View</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Spaces (Real Live Libraries from DB) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>Featured Spaces</Text>
              <Text style={styles.sectionHeaderSub}>Real-time libraries & verified branches</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (user) onNavigate(user.role === 'ADMIN' || user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
                else onNavigate('Register');
              }}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>Book now</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {loadingBranches ? (
            <View style={styles.branchesLoadingBox}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.branchesLoadingText}>Loading verified libraries...</Text>
            </View>
          ) : branches.length === 0 ? (
            <View style={styles.emptyBranchesCard}>
              <Ionicons name="business-outline" size={36} color={COLORS.outline} />
              <Text style={styles.emptyBranchesTitle}>No Libraries Added Yet</Text>
              <Text style={styles.emptyBranchesSub}>Libraries added by Admin will automatically appear here.</Text>
            </View>
          ) : (
            branches.map((branch, index) => {
              const defaultPhotos = [
                'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
                'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80',
              ];
              const branchPhoto = branch.photo || defaultPhotos[index % defaultPhotos.length];
              const totalSeats = branch.totalSeats || (branch.rooms ? branch.rooms.reduce((s: number, r: any) => s + (r.seatCount || r.capacity || 0), 0) : 0);
              const roomCount = branch.roomCount || (branch.rooms ? branch.rooms.length : 0);

              return (
                <TouchableOpacity 
                  key={branch.id || index}
                  style={styles.spaceCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (user) onNavigate(user.role === 'ADMIN' || user.role === 'OWNER' ? 'AdminDashboard' : 'StudentDashboard');
                    else onNavigate('Register');
                  }}
                >
                  <View style={styles.spaceImageContainer}>
                    <Image 
                      source={{ uri: branchPhoto }}
                      style={styles.spaceImage}
                    />
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color={COLORS.primary} />
                      <Text style={styles.ratingText}>4.9</Text>
                    </View>
                    {branch.code ? (
                      <View style={styles.branchCodeBadge}>
                        <Text style={styles.branchCodeText}>Branch #{branch.code}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.spaceCardBody}>
                    <Text style={styles.spaceName}>{branch.name}</Text>
                    <View style={styles.spaceLocationRow}>
                      <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.spaceLocationText} numberOfLines={1}>
                        {branch.address ? `${branch.address}${branch.city ? `, ${branch.city}` : ''}` : (branch.city || 'Sameer Library Network')}
                      </Text>
                    </View>
                    <View style={styles.spaceFooterRow}>
                      <View style={styles.seatPill}>
                        <View style={styles.seatPillDot} />
                        <Text style={styles.seatPillText}>
                          {totalSeats > 0 ? `${totalSeats} Seats Active` : 'Open for Admission'}
                        </Text>
                      </View>
                      <View style={styles.amenityItem}>
                        <Ionicons name="layers-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.amenityText}>
                          {roomCount > 0 ? `${roomCount} Study Rooms` : 'High-Speed Wi-Fi'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Interactive Live Seat Preview */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeaderRow}>
            <View>
              <Text style={styles.previewTitle}>Live Seat Preview</Text>
              <Text style={styles.previewSubtitle}>Tap any available seat to preview reservation</Text>
            </View>
            <View style={styles.liveAvailableBadge}>
              <Text style={styles.liveAvailableText}>Quiet Zone</Text>
            </View>
          </View>

          {/* Seat Grid Box */}
          <View style={styles.seatGridBox}>
            <View style={styles.seatGrid}>
              {['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'D1', 'D2', 'D3', 'D4'].map((seat) => {
                const isBooked = bookedSeats.includes(seat);
                const isSelected = selectedSeat === seat;

                return (
                  <TouchableOpacity
                    key={seat}
                    activeOpacity={0.7}
                    onPress={() => handleSeatPress(seat)}
                    style={[
                      styles.seatButton,
                      isBooked && styles.seatButtonBooked,
                      isSelected && styles.seatButtonSelected,
                    ]}
                  >
                    {isBooked ? (
                      <Ionicons name="person" size={14} color={COLORS.outline} />
                    ) : (
                      <Text style={[styles.seatButtonText, isSelected && styles.seatButtonTextSelected]}>
                        {seat}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Map Legend */}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendAvailable]} />
                <Text style={styles.legendLabel}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendSelected]} />
                <Text style={styles.legendLabel}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, styles.legendBooked]} />
                <Text style={styles.legendLabel}>Booked</Text>
              </View>
            </View>

            {/* Selected Seat Details Banner */}
            {selectedSeat && (
              <View style={styles.selectedSeatBanner}>
                <View>
                  <Text style={styles.selectedSeatTitle}>Seat {selectedSeat} Selected</Text>
                  <Text style={styles.selectedSeatSubtitle}>High-speed Wi-Fi • Power outlet</Text>
                </View>
                <TouchableOpacity 
                  style={styles.confirmSelectionBtn}
                  onPress={() => {
                    if (user) onNavigate('StudentDashboard');
                    else onNavigate('Register');
                  }}
                >
                  <Text style={styles.confirmSelectionText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Core Value Props */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>2+</Text>
            <Text style={styles.statCaption}>Branches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>150+</Text>
            <Text style={styles.statCaption}>Study Seats</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>500+</Text>
            <Text style={styles.statCaption}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>24/7</Text>
            <Text style={styles.statCaption}>CCTV Safe</Text>
          </View>
        </View>

        {/* Footer CTA */}
        <View style={styles.footerCta}>
          <Text style={styles.footerCtaTitle}>Ready for Focused Learning?</Text>
          <Text style={styles.footerCtaSubtitle}>
            Reserve your personal quiet space today and boost your productivity.
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => onNavigate(user ? 'StudentDashboard' : 'Register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeBottomTab} onTabPress={handleBottomTabPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  liveBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroTitleTeal: {
    color: COLORS.primary,
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  heroButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 104, 91, 0.2)',
      },
    }),
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginVertical: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)',
      },
    }),
  },
  quickActionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  branchesLoadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
  },
  branchesLoadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyBranchesCard: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyBranchesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptyBranchesSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  branchCodeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 104, 91, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  branchCodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  spaceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
      },
    }),
  },
  spaceImageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  spaceImage: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  spaceCardBody: {
    padding: 16,
    gap: 6,
  },
  spaceName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  spaceLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spaceLocationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  spaceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  seatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 104, 91, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  seatPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  seatPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amenityText: {
    fontSize: 13,
    color: COLORS.outline,
    fontWeight: '500',
  },
  previewSection: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  previewSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  liveAvailableBadge: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveAvailableText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSecondaryContainer,
  },
  seatGridBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
      },
    }),
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 8,
  },
  seatButton: {
    width: (width - 40 - 32 - 30) / 4,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatButtonBooked: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: COLORS.surfaceContainerHighest,
  },
  seatButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  seatButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  seatButtonTextSelected: {
    color: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  legendSelected: {
    backgroundColor: COLORS.primary,
  },
  legendBooked: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  selectedSeatBanner: {
    marginTop: 14,
    padding: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedSeatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectedSeatSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  confirmSelectionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmSelectionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footerCta: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    textAlign: 'center',
    gap: 12,
  },
  footerCtaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  footerCtaSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HomeScreen;
