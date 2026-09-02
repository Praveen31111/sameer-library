import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, SafeAreaView, ActivityIndicator, Platform, Image, Modal, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { COLORS } from '../utils/constants';

interface StudentDashboardProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<BottomNavTab>('Home');
  const [loading, setLoading] = useState(false);

  // Booking filters in My Bookings tab
  const [bookingsFilter, setBookingsFilter] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');

  // API States
  const [stats, setStats] = useState<{ daysPresent: number; totalHours: number; avgHoursPerDay: string; streak: number } | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Interactive Booking state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [seatsList, setSeatsList] = useState<any[]>([]);
  const [bookingPlan, setBookingPlan] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'SILENT' | 'GROUP' | 'MONITOR'>('ALL');

  // Fetch Overview data (attendance stats + bookings list)
  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const attRes = await apiRequest('/attendance');
      if (attRes.attendance) {
        setAttendanceLogs(attRes.attendance.slice(0, 5));
      }
      if (attRes.stats) {
        setStats(attRes.stats);
      }

      const bookRes = await apiRequest('/bookings');
      if (bookRes.bookings) {
        setBookingsList(bookRes.bookings);
      }
    } catch (err: any) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches and rooms for Book Tab
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/branches');
      if (res.branches && res.branches.length > 0) {
        setBranches(res.branches);
        if (!selectedBranchId) {
          const firstBranch = res.branches[0];
          setSelectedBranchId(firstBranch.id);
          if (firstBranch.rooms && firstBranch.rooms.length > 0) {
            setSelectedRoomId(firstBranch.rooms[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch seat layout when room changes
  const fetchSeats = async (roomId: string) => {
    setLoadingSeats(true);
    try {
      const res = await apiRequest(`/rooms/${roomId}/seats`);
      if (res.seats) {
        setSeatsList(res.seats);
      }
    } catch (err: any) {
      console.error('Failed to load seats:', err);
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Home' || activeTab === 'My Bookings') {
      fetchOverviewData();
    } else if (activeTab === 'Book') {
      fetchBranches();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedRoomId) {
      fetchSeats(selectedRoomId);
      setSelectedSeatId(null);
    } else {
      setSeatsList([]);
    }
  }, [selectedRoomId]);

  const handleLogout = async () => {
    Alert.alert('Confirm Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onNavigate('Home');
        },
      },
    ]);
  };

  const handleSeatPress = (seat: any) => {
    if (seat.status === 'blocked' || seat.rawStatus === 'BLOCKED') {
      Alert.alert('Seat Locked', 'This seat is reserved by library management.');
      return;
    }
    if (seat.status === 'booked' || seat.rawStatus === 'OCCUPIED') {
      Alert.alert('Seat Booked', 'This seat is currently booked by another student.');
      return;
    }
    setSelectedSeatId(selectedSeatId === seat.id ? null : seat.id);
  };

  const handlePayment = async () => {
    if (!selectedBranchId || !selectedRoomId || !selectedSeatId) {
      Alert.alert('Seat Required', 'Please tap an available seat on the grid to proceed.');
      return;
    }

    const price = bookingPlan === 'DAILY' ? 50 : bookingPlan === 'WEEKLY' ? 300 : 1000;
    const start = new Date(startDate);
    const end = new Date(start);
    if (bookingPlan === 'DAILY') {
      end.setDate(start.getDate() + 1);
    } else if (bookingPlan === 'WEEKLY') {
      end.setDate(start.getDate() + 7);
    } else if (bookingPlan === 'MONTHLY') {
      end.setDate(start.getDate() + 30);
    }

    setLoading(true);
    try {
      const res = await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: selectedBranchId,
          roomId: selectedRoomId,
          seatId: selectedSeatId,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          planType: bookingPlan,
          amount: price,
        }),
      });

      if (res.success && res.booking) {
        const createdBooking = res.booking;
        
        // Trigger simulated payment
        try {
          const orderRes = await apiRequest('/payments/create-order', {
            method: 'POST',
            body: JSON.stringify({ bookingId: createdBooking.id }),
          });

          await apiRequest('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              bookingId: createdBooking.id,
              razorpayOrderId: orderRes?.id || 'mock_order_id',
              razorpayPaymentId: `pay_mock_${Math.floor(Math.random() * 1000000)}`,
              razorpaySignature: 'mock_signature',
            }),
          });
        } catch (e) {
          // Dev mock fallback
        }

        setLoading(false);
        setSelectedSeatId(null);
        Alert.alert(
          'Booking Confirmed! 🎉',
          'Your seat reservation has been submitted successfully and is active.',
          [{ text: 'View Bookings', onPress: () => setActiveTab('My Bookings') }]
        );
        fetchOverviewData();
      } else {
        setLoading(false);
        Alert.alert('Booking Error', res.error || 'Could not process seat reservation.');
      }
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Connection failed.');
    }
  };

  // Find currently active booking if any
  const activeBooking = bookingsList.find(b => b.status === 'APPROVED' || b.status === 'CONFIRMED' || b.status === 'PENDING') || bookingsList[0];
  const selectedSeatObj = seatsList.find(s => s.id === selectedSeatId);
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  // -------------------------------------------------------------
  // TAB 1: HOME (OVERVIEW)
  // -------------------------------------------------------------
  const renderHomeTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Good morning, {user?.name?.split(' ')[0] || 'Student'} 👋</Text>
          <Text style={styles.greetingSubtitle}>Here is your study schedule for today.</Text>
        </View>

        {/* Active Booking Bento Card */}
        <View style={styles.activeBookingCard}>
          <View style={styles.activeBookingHeader}>
            <View>
              <Text style={styles.cardSuperLabel}>Seat Assignment</Text>
              <View style={styles.seatTitleRow}>
                <Text style={styles.bigSeatCode}>
                  {activeBooking ? (activeBooking.seat?.seatNumber || `Seat #${activeBooking.seatId?.slice(-3) || '42'}`) : 'A-42'}
                </Text>
                <View style={styles.activeNowBadge}>
                  <View style={styles.activeNowDot} />
                  <Text style={styles.activeNowText}>
                    {activeBooking ? (activeBooking.status === 'APPROVED' ? 'Active Now' : 'Pending Approval') : 'Available'}
                  </Text>
                </View>
              </View>
              <Text style={styles.activeLocationText}>
                {activeBooking?.room?.name || 'Quiet Zone'}, {activeBooking?.branch?.name || 'Main Library'}
              </Text>
            </View>
          </View>

          {/* Details Box */}
          <View style={styles.activeDetailsBox}>
            <View style={styles.activeDetailsRow}>
              <View style={styles.detailLeft}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="time" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.detailSubtext}>Session Access</Text>
                  <Text style={styles.detailMainText}>Full Day (08:00 AM - 10:00 PM)</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.detailSubtext}>Plan Type</Text>
                <Text style={styles.detailMainText}>{activeBooking?.planType || 'Monthly Pass'}</Text>
              </View>
            </View>

            <View style={styles.amenityRow}>
              <Ionicons name="wifi-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.amenitySmallText}>High-Speed Wi-Fi & Power socket available</Text>
            </View>
          </View>

          {/* Quick Buttons */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity 
              style={styles.cardActionBtn} 
              onPress={() => setActiveTab('Book')}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
              <Text style={styles.cardActionBtnText}>Change Seat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cardActionBtn} 
              onPress={() => setActiveTab('My Bookings')}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
              <Text style={styles.cardActionBtnText}>View Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Study Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.daysPresent || '14'}</Text>
            <Text style={styles.statLabel}>Days Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.totalHours || '68'}h</Text>
            <Text style={styles.statLabel}>Total Hours</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats?.streak || '5'} 🔥</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Quick CTA to book more sessions */}
        <TouchableOpacity 
          style={styles.bookCtaCard}
          onPress={() => setActiveTab('Book')}
          activeOpacity={0.85}
        >
          <View style={styles.bookCtaLeft}>
            <Text style={styles.bookCtaTitle}>Need another seat or room?</Text>
            <Text style={styles.bookCtaDesc}>Browse all branches, study pods, and AC zones.</Text>
          </View>
          <View style={styles.bookCtaIcon}>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // -------------------------------------------------------------
  // TAB 2: BOOK SEAT (CHOOSE LIBRARY -> CHOOSE ZONE -> SEATS)
  // -------------------------------------------------------------
  const renderBookTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select a Zone</Text>
          <Text style={styles.sectionSubtitle}>Choose the environment that best fits your focus needs.</Text>
        </View>

        {/* Branch Selector Horizontal Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalPills}>
          {branches.map(branch => {
            const isSelected = selectedBranchId === branch.id;
            return (
              <TouchableOpacity
                key={branch.id}
                style={[styles.filterPill, isSelected && styles.filterPillActive]}
                onPress={() => {
                  setSelectedBranchId(branch.id);
                  if (branch.rooms && branch.rooms.length > 0) {
                    setSelectedRoomId(branch.rooms[0].id);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                  📍 {branch.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Zone Filter Chips */}
        <View style={styles.zoneChipsRow}>
          <TouchableOpacity 
            style={[styles.zoneChip, zoneFilter === 'ALL' && styles.zoneChipActive]}
            onPress={() => setZoneFilter('ALL')}
          >
            <Text style={[styles.zoneChipText, zoneFilter === 'ALL' && styles.zoneChipTextActive]}>All Rooms</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.zoneChip, zoneFilter === 'SILENT' && styles.zoneChipActive]}
            onPress={() => setZoneFilter('SILENT')}
          >
            <Text style={[styles.zoneChipText, zoneFilter === 'SILENT' && styles.zoneChipTextActive]}>Silent Zone</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.zoneChip, zoneFilter === 'GROUP' && styles.zoneChipActive]}
            onPress={() => setZoneFilter('GROUP')}
          >
            <Text style={[styles.zoneChipText, zoneFilter === 'GROUP' && styles.zoneChipTextActive]}>Collab Pods</Text>
          </TouchableOpacity>
        </View>

        {/* Room / Zone Cards List */}
        <View style={styles.roomCardsList}>
          {selectedBranch?.rooms?.map((room: any) => {
            const isRoomSelected = selectedRoomId === room.id;
            return (
              <TouchableOpacity
                key={room.id}
                style={[styles.roomCard, isRoomSelected && styles.roomCardSelected]}
                onPress={() => setSelectedRoomId(room.id)}
                activeOpacity={0.85}
              >
                <View style={styles.roomCardHeader}>
                  <View>
                    <Text style={styles.roomCardTitle}>{room.name}</Text>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>Capacity: {room.capacity} Seats</Text>
                    </View>
                  </View>
                  <View style={styles.roomIconBox}>
                    <Ionicons name="volume-mute-outline" size={22} color={COLORS.primary} />
                  </View>
                </View>
                <Text style={styles.roomCardDesc}>
                  Absolute silence observed. Ergonomic private cubicles equipped with charging ports & Wi-Fi.
                </Text>
                <View style={styles.roomCardFooter}>
                  <Text style={styles.roomSelectActionText}>
                    {isRoomSelected ? '✓ Room Selected' : 'Select This Room'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Seat Selection Grid */}
        <View style={styles.seatSelectionSection}>
          <Text style={styles.seatSelectionTitle}>Select Seat</Text>
          
          {/* Map Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.legendAvailable]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.legendSelected]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.legendBooked]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.legendBlocked]} />
              <Text style={styles.legendText}>Blocked</Text>
            </View>
          </View>

          {/* Grid Container */}
          <View style={styles.seatGridContainer}>
            {loadingSeats ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
            ) : seatsList.length === 0 ? (
              <Text style={styles.noSeatsText}>No seats available in this room.</Text>
            ) : (
              <View style={styles.gridWrap}>
                {seatsList.map((seat: any) => {
                  const isBooked = seat.status === 'booked' || seat.rawStatus === 'OCCUPIED';
                  const isBlocked = seat.status === 'blocked' || seat.rawStatus === 'BLOCKED';
                  const isSelected = selectedSeatId === seat.id;

                  return (
                    <TouchableOpacity
                      key={seat.id}
                      style={[
                        styles.gridSeatBtn,
                        isBooked && styles.gridSeatBooked,
                        isBlocked && styles.gridSeatBlocked,
                        isSelected && styles.gridSeatSelected,
                      ]}
                      onPress={() => handleSeatPress(seat)}
                      activeOpacity={0.7}
                    >
                      {isBooked ? (
                        <Ionicons name="person" size={14} color={COLORS.outline} />
                      ) : isBlocked ? (
                        <Ionicons name="lock-closed" size={14} color={COLORS.error} />
                      ) : (
                        <Text style={[styles.gridSeatText, isSelected && styles.gridSeatTextSelected]}>
                          {seat.seatNumber}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Selected Seat Confirmation Bottom Sheet */}
        {selectedSeatId && (
          <View style={styles.confirmationSheet}>
            <View style={styles.confirmHeader}>
              <View>
                <Text style={styles.confirmSeatTitle}>
                  Seat {selectedSeatObj?.seatNumber || 'Selected'}
                </Text>
                <Text style={styles.confirmSeatSub}>High-Speed Wi-Fi • Power Outlet</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.confirmPrice}>
                  ₹{bookingPlan === 'DAILY' ? '50' : bookingPlan === 'WEEKLY' ? '300' : '1,000'}
                </Text>
                <Text style={styles.confirmDuration}>/ {bookingPlan.toLowerCase()}</Text>
              </View>
            </View>

            {/* Plan selector pills */}
            <View style={styles.planSelectorRow}>
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map(plan => (
                <TouchableOpacity
                  key={plan}
                  style={[styles.planPill, bookingPlan === plan && styles.planPillActive]}
                  onPress={() => setBookingPlan(plan)}
                >
                  <Text style={[styles.planPillText, bookingPlan === plan && styles.planPillTextActive]}>
                    {plan === 'DAILY' ? 'Daily Pass' : plan === 'WEEKLY' ? 'Weekly' : 'Monthly Pass'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handlePayment}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'Processing...' : 'Confirm Selection'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  // -------------------------------------------------------------
  // TAB 3: MY BOOKINGS
  // -------------------------------------------------------------
  const renderBookingsTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Bookings</Text>
          <Text style={styles.sectionSubtitle}>Manage your study sessions and reservations.</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.bookingTabsRow}>
          <TouchableOpacity 
            style={[styles.bookingTab, bookingsFilter === 'ACTIVE' && styles.bookingTabActive]}
            onPress={() => setBookingsFilter('ACTIVE')}
          >
            <Text style={[styles.bookingTabText, bookingsFilter === 'ACTIVE' && styles.bookingTabTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bookingTab, bookingsFilter === 'PENDING' && styles.bookingTabActive]}
            onPress={() => setBookingsFilter('PENDING')}
          >
            <Text style={[styles.bookingTabText, bookingsFilter === 'PENDING' && styles.bookingTabTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.bookingTab, bookingsFilter === 'HISTORY' && styles.bookingTabActive]}
            onPress={() => setBookingsFilter('HISTORY')}
          >
            <Text style={[styles.bookingTabText, bookingsFilter === 'HISTORY' && styles.bookingTabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bookings List */}
        <View style={styles.bookingsContainer}>
          {bookingsList.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bookmark-outline" size={48} color={COLORS.outline} />
              <Text style={styles.emptyTitle}>No reservations found</Text>
              <Text style={styles.emptyDesc}>Reserve a seat today to begin your study journey.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveTab('Book')}>
                <Text style={styles.primaryButtonText}>Book a Seat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookingsList.map((booking: any) => {
              const isApproved = booking.status === 'APPROVED' || booking.status === 'CONFIRMED';
              const isPending = booking.status === 'PENDING';

              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingCardHeader}>
                    <View style={styles.bookingCardLeft}>
                      <View style={styles.bookingIconBox}>
                        <Ionicons name="library" size={20} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.bookingBranchName}>{booking.branch?.name || 'Sameer Library'}</Text>
                        <Text style={styles.bookingRoomName}>{booking.room?.name || 'Silent Zone'}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusTag, isApproved ? styles.statusApproved : styles.statusPending]}>
                      <Text style={[styles.statusTagText, isApproved ? styles.statusApprovedText : styles.statusPendingText]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>

                  {/* Grid of details */}
                  <View style={styles.bookingMetaGrid}>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Seat</Text>
                      <Text style={styles.metaValue}>{booking.seat?.seatNumber || 'Seat #' + booking.seatId?.slice(-3)}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Plan</Text>
                      <Text style={styles.metaValue}>{booking.planType}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Start Date</Text>
                      <Text style={styles.metaValue}>{new Date(booking.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Amount</Text>
                      <Text style={styles.metaValue}>₹{booking.amount || '1000'}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingActionsRow}>
                    <TouchableOpacity 
                      style={styles.modifyBtn}
                      onPress={() => setActiveTab('Book')}
                    >
                      <Text style={styles.modifyBtnText}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelBtn}
                      onPress={() => Alert.alert('Cancel Reservation', 'Contact library helpdesk to process cancellation and refunds.')}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  // -------------------------------------------------------------
  // TAB 4: PROFILE & DIGITAL LIBRARY PASS
  // -------------------------------------------------------------
  const renderProfileTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
              style={styles.profileAvatar}
            />
            <TouchableOpacity style={styles.avatarEditBtn} onPress={() => Alert.alert('Edit Avatar', 'Profile avatar update coming soon.')}>
              <Ionicons name="pencil" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Student Member'}</Text>
          <Text style={styles.profileRole}>{user?.role || 'Active Student'}</Text>

          <View style={styles.memberBadgesRow}>
            <View style={styles.memberBadge}>
              <View style={styles.memberBadgeDot} />
              <Text style={styles.memberBadgeText}>Active Member</Text>
            </View>
            <View style={[styles.memberBadge, { backgroundColor: COLORS.secondaryContainer }]}>
              <Text style={[styles.memberBadgeText, { color: COLORS.onSecondaryContainer }]}>Pro Plan</Text>
            </View>
          </View>
        </View>

        {/* Digital ID Pass Card (Glassmorphism Styled) */}
        <View style={styles.digitalIdCard}>
          <View style={styles.digitalIdHeader}>
            <View>
              <Text style={styles.digitalIdTitle}>Library Pass</Text>
              <Text style={styles.digitalIdSub}>Tap QR code to scan at entry gate</Text>
            </View>
            <Ionicons name="book" size={28} color={COLORS.primary} />
          </View>

          {/* QR Code Container */}
          <TouchableOpacity 
            style={styles.qrCodeBox} 
            activeOpacity={0.9}
            onPress={() => Alert.alert('Digital Pass QR', 'Hold this QR code against the gate turnstile scanner.')}
          >
            <Ionicons name="qr-code" size={140} color={COLORS.text} />
            <View style={styles.scanLine} />
          </TouchableOpacity>

          <View style={styles.digitalIdFooter}>
            <View>
              <Text style={styles.passLabel}>Student ID</Text>
              <Text style={styles.passValue}>LIB-2024-{user?.id?.slice(-4) || '8942'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.passLabel}>Valid Through</Text>
              <Text style={styles.passValue}>Dec 2026</Text>
            </View>
          </View>
        </View>

        {/* Personal Details Bento */}
        <View style={styles.personalDetailsCard}>
          <Text style={styles.detailsCardTitle}>Personal Details</Text>
          
          <View style={styles.detailItemRow}>
            <View style={styles.detailIconSmall}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailFieldLabel}>Email Address</Text>
              <Text style={styles.detailFieldValue}>{user?.email || 'student@university.edu'}</Text>
            </View>
          </View>

          <View style={styles.detailItemRow}>
            <View style={styles.detailIconSmall}>
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailFieldLabel}>Mobile Number</Text>
              <Text style={styles.detailFieldValue}>{user?.phone || '+91 9876543210'}</Text>
            </View>
          </View>

          <View style={[styles.detailItemRow, { borderBottomWidth: 0 }]}>
            <View style={styles.detailIconSmall}>
              <Ionicons name="school-outline" size={18} color={COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailFieldLabel}>Account Role</Text>
              <Text style={styles.detailFieldValue}>{user?.role || 'STUDENT'}</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="book" size={18} color="#ffffff" />
          </View>
          <Text style={styles.appBarTitle}>Sameer Library</Text>
        </View>

        <View style={styles.appBarRight}>
          <TouchableOpacity 
            style={styles.notifBtn} 
            onPress={() => Alert.alert('Notifications', 'No new alerts.')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.avatarThumb}
            onPress={() => setActiveTab('Profile')}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }}
              style={styles.avatarThumbImg}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'Home' && renderHomeTab()}
        {activeTab === 'Book' && renderBookTab()}
        {activeTab === 'My Bookings' && renderBookingsTab()}
        {activeTab === 'Profile' && renderProfileTab()}
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNavBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90,
  },
  topAppBar: {
    height: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.secondaryContainer,
  },
  avatarThumbImg: {
    width: '100%',
    height: '100%',
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  activeBookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0,0,0,0.04)',
      },
    }),
  },
  activeBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardSuperLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  bigSeatCode: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.primary,
  },
  activeNowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  activeNowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
  },
  activeNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.onSecondaryContainer,
  },
  activeLocationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  activeDetailsBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  activeDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 104, 91, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSubtext: {
    fontSize: 11,
    color: COLORS.outline,
  },
  detailMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amenitySmallText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 12,
    gap: 6,
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookCtaCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  bookCtaLeft: {
    flex: 1,
  },
  bookCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  bookCtaDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  bookCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  horizontalPills: {
    marginBottom: 14,
  },
  filterPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    marginRight: 10,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  zoneChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  zoneChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  zoneChipActive: {
    backgroundColor: COLORS.secondaryContainer,
  },
  zoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  zoneChipTextActive: {
    color: COLORS.onSecondaryContainer,
    fontWeight: '700',
  },
  roomCardsList: {
    gap: 14,
    marginBottom: 24,
  },
  roomCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  roomCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 104, 91, 0.02)',
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  roomBadge: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roomBadgeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roomIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  roomCardFooter: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  roomSelectActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  seatSelectionSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  seatSelectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
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
  legendBlocked: {
    backgroundColor: COLORS.errorContainer,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  seatGridContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noSeatsText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: 30,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  gridSeatBtn: {
    width: (width - 40 - 32 - 30) / 4,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridSeatBooked: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: COLORS.surfaceContainerHighest,
  },
  gridSeatBlocked: {
    backgroundColor: COLORS.errorContainer,
    borderColor: COLORS.errorContainer,
  },
  gridSeatSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  gridSeatText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  gridSeatTextSelected: {
    color: '#ffffff',
  },
  confirmationSheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 30px rgba(0,0,0,0.1)',
      },
    }),
  },
  confirmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmSeatTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmSeatSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  confirmPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  confirmDuration: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  planPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
  },
  planPillActive: {
    backgroundColor: COLORS.secondaryContainer,
  },
  planPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  planPillTextActive: {
    color: COLORS.onSecondaryContainer,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bookingTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  bookingTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  bookingTabActive: {
    borderBottomColor: COLORS.primary,
  },
  bookingTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bookingTabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  bookingsContainer: {
    gap: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 30,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingBranchName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  bookingRoomName: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: COLORS.secondaryContainer,
  },
  statusPending: {
    backgroundColor: COLORS.tertiaryFixed,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusApprovedText: {
    color: COLORS.onSecondaryContainer,
  },
  statusPendingText: {
    color: COLORS.tertiary,
  },
  bookingMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
  },
  metaCell: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: COLORS.outline,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modifyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
  },
  modifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  profileRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  memberBadgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  digitalIdCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 20px rgba(0,0,0,0.06)',
      },
    }),
  },
  digitalIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  digitalIdTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  digitalIdSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  qrCodeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
  digitalIdFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  passLabel: {
    fontSize: 11,
    color: COLORS.outline,
  },
  passValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  personalDetailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailFieldLabel: {
    fontSize: 11,
    color: COLORS.outline,
  },
  detailFieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default StudentDashboard;
