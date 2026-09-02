import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  Pressable,
  RefreshControl,
  Image,
  Animated,
  Linking,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { COLORS } from '../utils/constants';

interface AdminDashboardProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

type AdminTab = 'Overview' | 'Bookings' | 'Facilities' | 'Live' | 'Students' | 'Logs';

// Curated high-aesthetic modern study spaces
const PHOTO_PRESETS = [
  { label: 'Modern Hall', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
  { label: 'Silent Zone', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cubicles', url: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=800&q=80' },
  { label: 'Discussion Lounge', url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80' },
  { label: 'Classic Library', url: 'https://images.unsplash.com/photo-1507842229452-e56598c19958?auto=format&fit=crop&w=800&q=80' },
  { label: 'Executive AC Room', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('Overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Overview Stats
  const [statsData, setStatsData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // 2. Bookings Management
  const [bookingFilter, setBookingFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingActionLoading, setBookingActionLoading] = useState<string | null>(null);

  // Approval Modal with Online / Offline payment selection
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedBookingToApprove, setSelectedBookingToApprove] = useState<any>(null);

  // Revenue Breakdown Ledger Modal
  const [revenueModalVisible, setRevenueModalVisible] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [revenueSearch, setRevenueSearch] = useState('');

  // 3. Pricing & Offers Management State
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [monthlyBasePrice, setMonthlyBasePrice] = useState('1000');
  const [discountPercent, setDiscountPercent] = useState('20');
  const [discountActive, setDiscountActive] = useState(false);
  const [offerTitle, setOfferTitle] = useState('Limited Time Offer: Book your monthly seat at a discount!');
  const [weeklyPrice, setWeeklyPrice] = useState('300');
  const [dailyPrice, setDailyPrice] = useState('50');
  const [savingPricing, setSavingPricing] = useState(false);

  // Live breakdown stats (library-wise and room-wise)
  const [libraryStats, setLibraryStats] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState<any[]>([]);
  const [liveRoomFilter, setLiveRoomFilter] = useState<string>('ALL');

  // Blinking alert animation for new bookings in Overview
  const blinkingAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkingAnim, {
          toValue: 0.2,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(blinkingAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // 3. Facilities State (Branches -> Rooms -> Seats)
  const [facilityLevel, setFacilityLevel] = useState<'branches' | 'rooms' | 'seats'>('branches');
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomSeats, setRoomSeats] = useState<any[]>([]);

  // Branch Creation & Edit State
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchPhoto, setBranchPhoto] = useState(PHOTO_PRESETS[0].url);

  // Room Creation & Edit State
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('20');
  const [roomPhoto, setRoomPhoto] = useState(PHOTO_PRESETS[1].url);

  // Seats State
  const [addSeatModal, setAddSeatModal] = useState(false);
  const [newSeatCount, setNewSeatCount] = useState('5');

  // 4. Live Seats State
  const [liveSeats, setLiveSeats] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [selectedOccupant, setSelectedOccupant] = useState<any>(null);
  const [occupantModalVisible, setOccupantModalVisible] = useState(false);

  // 5. Students Directory State
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 6. Logs State
  const [logsSubTab, setLogsSubTab] = useState<'Attendance' | 'Payments'>('Attendance');
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);

  // Hardware Back Button Navigation Handler (Step-by-step back)
  useEffect(() => {
    const handleHardwareBack = () => {
      if (pricingModalVisible) {
        setPricingModalVisible(false);
        return true;
      }
      if (revenueModalVisible) {
        setRevenueModalVisible(false);
        return true;
      }
      if (approvalModalVisible) {
        setApprovalModalVisible(false);
        return true;
      }
      if (occupantModalVisible) {
        setOccupantModalVisible(false);
        return true;
      }
      if (addSeatModal) {
        setAddSeatModal(false);
        return true;
      }
      if (roomModalVisible) {
        setRoomModalVisible(false);
        return true;
      }
      if (branchModalVisible) {
        setBranchModalVisible(false);
        return true;
      }
      if (activeTab === 'Facilities') {
        if (facilityLevel === 'seats') {
          setFacilityLevel('rooms');
          return true;
        }
        if (facilityLevel === 'rooms') {
          setFacilityLevel('branches');
          return true;
        }
      }
      if (activeTab !== 'Overview') {
        setActiveTab('Overview');
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [
    pricingModalVisible,
    revenueModalVisible,
    approvalModalVisible,
    occupantModalVisible,
    addSeatModal,
    roomModalVisible,
    branchModalVisible,
    activeTab,
    facilityLevel,
  ]);

  // API Call: Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await apiRequest('/admin/stats');
      if (res.stats) setStatsData(res.stats);
      if (res.occupancyData) setOccupancyData(res.occupancyData);
      if (res.recentActivity) setRecentActivity(res.recentActivity);

      // Also refresh pending bookings so blinking alert is live
      const bRes = await apiRequest('/admin/bookings?status=PENDING');
      if (bRes.bookings) setBookings(bRes.bookings);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // API Call: Fetch Bookings
  const fetchBookings = async (status: string) => {
    try {
      const endpoint = status === 'ALL' ? '/admin/bookings' : `/admin/bookings?status=${status}`;
      const res = await apiRequest(endpoint);
      if (res.bookings) setBookings(res.bookings);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  // API Call: Fetch Branches
  const fetchBranches = async () => {
    try {
      const res = await apiRequest('/admin/branches');
      if (res.branches) setBranchesList(res.branches);
    } catch (err: any) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // API Call: Fetch Rooms for selected branch
  const fetchRoomsForBranch = async (branchId: string) => {
    try {
      const res = await apiRequest(`/admin/rooms?branchId=${branchId}`);
      if (res.rooms) setRoomsList(res.rooms);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  // API Call: Fetch Seats for selected room
  const fetchSeatsForRoom = async (roomId: string) => {
    try {
      const res = await apiRequest(`/rooms/${roomId}/seats`);
      if (res.seats) setRoomSeats(res.seats);
    } catch (err: any) {
      console.error('Failed to fetch seats:', err);
    }
  };

  // API Call: Fetch Live Seats
  const fetchLiveSeats = async () => {
    try {
      const res = await apiRequest('/admin/live');
      if (res.seats) setLiveSeats(res.seats);
      if (res.stats) setLiveStats(res.stats);
      if (res.libraryStats) setLibraryStats(res.libraryStats);
      if (res.roomStats) setRoomStats(res.roomStats);
    } catch (err: any) {
      console.error('Failed to fetch live seats:', err);
    }
  };

  // API Call: Fetch Students
  const fetchStudents = async () => {
    try {
      const res = await apiRequest('/admin/students');
      if (res.students) setStudents(res.students);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    }
  };

  // API Call: Fetch Logs
  const fetchLogs = async () => {
    try {
      const [attRes, payRes] = await Promise.all([
        apiRequest('/admin/attendance'),
        apiRequest('/admin/payments'),
      ]);
      if (attRes.attendance) setAttendanceLogs(attRes.attendance);
      if (payRes.payments) setPaymentLogs(payRes.payments);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // API Call: Fetch Pricing & Offers
  const fetchPricing = async () => {
    try {
      const res = await apiRequest('/pricing');
      if (res?.pricing) {
        setMonthlyBasePrice(String(res.pricing.monthlyBasePrice ?? 1000));
        setDiscountPercent(String(res.pricing.discountPercent ?? 0));
        setDiscountActive(Boolean(res.pricing.discountActive));
        setOfferTitle(res.pricing.offerTitle || '');
        setWeeklyPrice(String(res.pricing.weeklyPrice ?? 300));
        setDailyPrice(String(res.pricing.dailyPrice ?? 50));
      }
    } catch (err: any) {
      console.error('Failed to fetch pricing:', err);
    }
  };

  // Save Pricing & Offers
  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const res = await apiRequest('/pricing', {
        method: 'POST',
        body: JSON.stringify({
          monthlyBasePrice: Number(monthlyBasePrice) || 1000,
          discountPercent: Number(discountPercent) || 0,
          discountActive,
          offerTitle,
          weeklyPrice: Number(weeklyPrice) || 300,
          dailyPrice: Number(dailyPrice) || 50,
        }),
      });
      if (res.success) {
        Alert.alert('Pricing Updated ✅', 'New seat prices & discount offers have been successfully saved and applied for all students!');
        setPricingModalVisible(false);
      } else {
        Alert.alert('Error', res.error || 'Failed to update pricing');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  // Main Active Tab Loader
  const loadActiveTabData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'Overview') {
      await Promise.all([fetchStats(), fetchPricing()]);
    }
    else if (activeTab === 'Bookings') await fetchBookings(bookingFilter);
    else if (activeTab === 'Facilities') {
      if (facilityLevel === 'branches') await fetchBranches();
      else if (facilityLevel === 'rooms' && selectedBranch) await fetchRoomsForBranch(selectedBranch.id);
      else if (facilityLevel === 'seats' && selectedRoom) await fetchSeatsForRoom(selectedRoom.id);
    } else if (activeTab === 'Live') await fetchLiveSeats();
    else if (activeTab === 'Students') await fetchStudents();
    else if (activeTab === 'Logs') await fetchLogs();
    setLoading(false);
  }, [activeTab, bookingFilter, facilityLevel, selectedBranch, selectedRoom]);

  useEffect(() => {
    loadActiveTabData();
  }, [loadActiveTabData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveTabData();
    setRefreshing(false);
  };

  // Handle pick Branch photo from phone
  const handlePickBranchPhoto = () => {
    Alert.alert('Library Photo', 'Select branch photo from mobile:', [
      {
        text: 'Take Photo 📸',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              const base64Data = result.assets[0].base64;
              const photoUri = base64Data
                ? `data:image/jpeg;base64,${base64Data}`
                : result.assets[0].uri;
              setBranchPhoto(photoUri);
            }
          } catch (e: any) {
            Alert.alert('Error', 'Could not open camera.');
          }
        },
      },
      {
        text: 'Choose from Gallery 🖼️',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Gallery permission is needed to choose a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              const base64Data = result.assets[0].base64;
              const photoUri = base64Data
                ? `data:image/jpeg;base64,${base64Data}`
                : result.assets[0].uri;
              setBranchPhoto(photoUri);
            }
          } catch (e: any) {
            Alert.alert('Error', 'Could not open gallery.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Handle pick Room photo from phone
  const handlePickRoomPhoto = () => {
    Alert.alert('Room Photo', 'Select room photo from mobile:', [
      {
        text: 'Take Photo 📸',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Camera permission is needed to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              const base64Data = result.assets[0].base64;
              const photoUri = base64Data
                ? `data:image/jpeg;base64,${base64Data}`
                : result.assets[0].uri;
              setRoomPhoto(photoUri);
            }
          } catch (e: any) {
            Alert.alert('Error', 'Could not open camera.');
          }
        },
      },
      {
        text: 'Choose from Gallery 🖼️',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission required', 'Gallery permission is needed to choose a photo.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.7,
              base64: true,
            });
            if (!result.canceled && result.assets[0]) {
              const base64Data = result.assets[0].base64;
              const photoUri = base64Data
                ? `data:image/jpeg;base64,${base64Data}`
                : result.assets[0].uri;
              setRoomPhoto(photoUri);
            }
          } catch (e: any) {
            Alert.alert('Error', 'Could not open gallery.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // 1-Tap WhatsApp Notification function
  const sendWhatsAppNotification = (booking: any) => {
    const rawPhone = booking.student?.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      Alert.alert('Phone Missing', 'No phone number is available for this student.');
      return;
    }
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${booking.student?.name || 'Student'}! 📚\n\nYour seat booking at Sameer Library has been APPROVED!\n\n🪑 Seat: ${booking.seat}\n🏢 Room: ${booking.room || 'Silent Zone'}\n🏛️ Library: ${booking.branch || 'Main Branch'}\n📅 Plan: ${booking.planType}\n💰 Amount Paid: ₹${booking.amount}\n✅ Status: ACTIVE\n\nThank you for choosing Sameer Library! Feel free to reach out to the admin desk if you need anything.`
    );
    Linking.openURL(`https://wa.me/${formattedPhone}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    });
  };

  // Send WhatsApp Payment Receipt
  const sendReceiptWhatsApp = (payment: any) => {
    const rawPhone = payment.studentPhone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      Alert.alert('Phone Missing', 'No phone number available for this student to send WhatsApp receipt.');
      return;
    }
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `🧾 *OFFICIAL PAYMENT RECEIPT - SAMEER LIBRARY*\n\n` +
      `👤 Student: ${payment.studentName}\n` +
      `🪑 Seat: ${payment.seatNumber} • ${payment.roomName}\n` +
      `🏛️ Branch: ${payment.branchName || 'Sameer Library'}\n` +
      `💰 Amount Paid: ₹${payment.amount}\n` +
      `💳 Mode: ${payment.method}\n` +
      `📅 Plan: ${payment.plan}\n` +
      `🕒 Date & Time: ${payment.date} ${payment.time || ''}\n` +
      `🆔 Ref/Txn ID: ${payment.transactionId}\n` +
      `✅ Status: SUCCESSFUL / VERIFIED\n\n` +
      `Thank you for studying at Sameer Library! Please keep this receipt for verification.`
    );
    Linking.openURL(`https://wa.me/${formattedPhone}?text=${msg}`).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp.');
    });
  };

  // Open Approval Modal
  const handleOpenApprovalModal = (booking: any) => {
    setSelectedBookingToApprove(booking);
    setApprovalModalVisible(true);
  };

  // Approve with payment method selection (Online or Offline)
  const handleApproveWithPayment = async (paymentMode: 'ONLINE' | 'OFFLINE') => {
    if (!selectedBookingToApprove) return;
    const booking = selectedBookingToApprove;
    const approvedAmount = Number(booking.amount) || 0;
    setApprovalModalVisible(false);
    setBookingActionLoading(booking.id);

    // 1. INSTANT OPTIMISTIC REVENUE & STATS UPDATE ON THE SCREEN
    setStatsData((prev: any) => ({
      ...prev,
      revenue: (prev?.revenue || 0) + approvedAmount,
      pendingApprovals: Math.max((prev?.pendingApprovals || 1) - 1, 0),
      activeBookings: (prev?.activeBookings || 0) + 1,
    }));

    // 2. PREPEND TO PAYMENT LOGS IMMEDIATELY SO IT APPEARS IN REVENUE BREAKDOWN
    const newPaymentEntry = {
      id: `pay_${Date.now()}`,
      transactionId: `${paymentMode === 'ONLINE' ? 'UPI_ONLINE' : 'CASH_DESK'}_${Date.now()}`,
      studentName: booking.student?.name || 'Student',
      studentEmail: booking.student?.email || 'N/A',
      studentPhone: booking.student?.phone || null,
      seatNumber: booking.seat || 'Seat',
      roomName: booking.room || 'Silent Zone',
      branchName: booking.branch || 'Main Library',
      amount: approvedAmount,
      plan: booking.planType || 'MONTHLY',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'success',
      method: paymentMode === 'ONLINE' ? 'Online (UPI / Netbanking)' : 'Offline (Cash / Counter)',
    };
    setPaymentLogs((prev) => [newPaymentEntry, ...prev]);

    try {
      const res = await apiRequest('/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          action: 'approve',
          paymentMode,
        }),
      });

      if (res.success) {
        Alert.alert(
          'Booking Approved 🎉',
          `Seat ${booking.seat} approved successfully!\n\n💰 ₹${approvedAmount} added to Monthly Revenue (${paymentMode === 'ONLINE' ? 'Online Payment' : 'Cash/Counter'}).`,
          [
            { text: 'Done', style: 'cancel' },
            {
              text: '💬 Send on WhatsApp',
              onPress: () => sendWhatsAppNotification(booking),
            },
          ]
        );
        fetchBookings(bookingFilter);
        fetchLogs(); // Synchronize with backend database payments!
        fetchStats();
      } else {
        Alert.alert('Error', res.error || 'Failed to approve booking.');
        fetchStats();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
      fetchStats();
    } finally {
      setBookingActionLoading(null);
      setSelectedBookingToApprove(null);
    }
  };

  // Open Branch Modal (Create or Edit)
  const handleOpenBranchModal = (branchToEdit?: any) => {
    if (branchToEdit) {
      setEditingBranchId(branchToEdit.id);
      setBranchName(branchToEdit.name || '');
      setBranchCode(branchToEdit.code || '');
      setBranchAddress(branchToEdit.address || '');
      setBranchCity(branchToEdit.city || '');
      setBranchPhoto(branchToEdit.photo || PHOTO_PRESETS[0].url);
    } else {
      setEditingBranchId(null);
      setBranchName('');
      setBranchCode('');
      setBranchAddress('');
      setBranchCity('');
      setBranchPhoto(PHOTO_PRESETS[0].url);
    }
    setBranchModalVisible(true);
  };

  // Save Branch (Create / Update)
  const handleSaveBranch = async () => {
    if (!branchName || (!editingBranchId && !branchCode)) {
      Alert.alert('Required Fields', 'Please enter branch name and code.');
      return;
    }
    setLoading(true);
    try {
      if (editingBranchId) {
        // Update Branch
        const res = await apiRequest('/admin/branches', {
          method: 'PATCH',
          body: JSON.stringify({
            id: editingBranchId,
            name: branchName,
            address: branchAddress,
            city: branchCity,
            photo: branchPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Branch "${branchName}" updated successfully!`);
          setBranchModalVisible(false);
          fetchBranches();
        } else {
          Alert.alert('Error', res.error || 'Failed to update branch');
        }
      } else {
        // Create Branch
        const res = await apiRequest('/admin/branches', {
          method: 'POST',
          body: JSON.stringify({
            name: branchName,
            code: branchCode.toUpperCase(),
            address: branchAddress,
            city: branchCity,
            photo: branchPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Branch "${branchName}" created!`);
          setBranchModalVisible(false);
          fetchBranches();
        } else {
          Alert.alert('Error', res.error || 'Failed to create branch');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Delete Branch
  const handleDeleteBranch = (branchId: string, branchName: string) => {
    Alert.alert('Delete Branch', `Are you sure you want to delete "${branchName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/branches?id=${branchId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Branch deleted successfully');
              fetchBranches();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete branch');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Open Room Modal (Create or Edit)
  const handleOpenRoomModal = (roomToEdit?: any) => {
    if (roomToEdit) {
      setEditingRoomId(roomToEdit.id);
      setRoomName(roomToEdit.name || '');
      setRoomCapacity(String(roomToEdit.capacity || 20));
      setRoomPhoto(roomToEdit.photo || PHOTO_PRESETS[1].url);
    } else {
      setEditingRoomId(null);
      setRoomName('');
      setRoomCapacity('20');
      setRoomPhoto(PHOTO_PRESETS[1].url);
    }
    setRoomModalVisible(true);
  };

  // Save Room (Create / Update)
  const handleSaveRoom = async () => {
    if (!roomName) {
      Alert.alert('Required Fields', 'Please enter room name');
      return;
    }
    setLoading(true);
    try {
      if (editingRoomId) {
        // Update Room
        const res = await apiRequest('/admin/rooms', {
          method: 'PATCH',
          body: JSON.stringify({
            id: editingRoomId,
            name: roomName,
            capacity: parseInt(roomCapacity) || 20,
            photo: roomPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Room "${roomName}" updated!`);
          setRoomModalVisible(false);
          fetchRoomsForBranch(selectedBranch.id);
        } else {
          Alert.alert('Error', res.error || 'Failed to update room');
        }
      } else {
        // Create Room
        const res = await apiRequest('/admin/rooms', {
          method: 'POST',
          body: JSON.stringify({
            branchId: selectedBranch.id,
            name: roomName,
            capacity: parseInt(roomCapacity) || 20,
            photo: roomPhoto,
          }),
        });
        if (res.success) {
          Alert.alert('Success', `Room "${roomName}" created!`);
          setRoomModalVisible(false);
          fetchRoomsForBranch(selectedBranch.id);
        } else {
          Alert.alert('Error', res.error || 'Failed to create room');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string, roomName: string) => {
    Alert.alert('Delete Room', `Are you sure you want to delete room "${roomName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/rooms?id=${roomId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Room deleted successfully');
              fetchRoomsForBranch(selectedBranch.id);
            } else {
              Alert.alert('Error', res.error || 'Failed to delete room');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Add Seats (Batch)
  const handleAddSeats = async () => {
    if (!selectedRoom) return;
    const count = parseInt(newSeatCount) || 5;
    setLoading(true);
    try {
      const res = await apiRequest(`/rooms/${selectedRoom.id}/seats`, {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
      if (res.success) {
        Alert.alert('Seats Generated', `Successfully added ${count} new seats!`);
        setAddSeatModal(false);
        fetchSeatsForRoom(selectedRoom.id);
      } else {
        Alert.alert('Error', res.error || 'Failed to generate seats');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1-Tap Lock / Unlock / Delete Seat
  const handleSeatAction = async (seat: any, action: 'BLOCK' | 'UNBLOCK' | 'DELETE') => {
    const actionName = action === 'BLOCK' ? 'Lock/Block' : action === 'UNBLOCK' ? 'Unlock' : 'Delete';
    Alert.alert(
      `${actionName} Seat`,
      `Are you sure you want to ${actionName.toLowerCase()} seat ${seat.seatNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionName,
          style: action === 'DELETE' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const res = await apiRequest(`/rooms/${selectedRoom.id}/seats`, {
                method: 'PATCH',
                body: JSON.stringify({ seatId: seat.id, action }),
              });
              if (res.success) {
                fetchSeatsForRoom(selectedRoom.id);
              } else {
                Alert.alert('Error', res.error || 'Action failed');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Approve / Reject Booking
  const handleBookingAction = async (bookingId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const bObj = bookings.find(b => b.id === bookingId);
      if (bObj) {
        handleOpenApprovalModal(bObj);
        return;
      }
    }
    Alert.alert(`Confirm Reject`, `Are you sure you want to reject this booking request?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setBookingActionLoading(bookingId);
          try {
            const res = await apiRequest('/admin/bookings', {
              method: 'POST',
              body: JSON.stringify({ bookingId, action: 'reject' }),
            });
            if (res.success) {
              Alert.alert('Success', `Booking rejected.`);
              fetchBookings(bookingFilter);
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setBookingActionLoading(null);
          }
        },
      },
    ]);
  };

  // Delete Student
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    Alert.alert('Delete Student', `Permanently delete student ${studentName}? All related bookings and attendance will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiRequest(`/admin/students?id=${studentId}`, { method: 'DELETE' });
            if (res.success) {
              Alert.alert('Deleted', 'Student record deleted successfully');
              fetchStudents();
            }
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to log out from Admin Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          onNavigate('Home');
        },
      },
    ]);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery))
  );

  const renderTabContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Syncing records...</Text>
        </View>
      );
    }

    switch (activeTab) {
      // 1. OVERVIEW TAB
      case 'Overview':
        return (
          <ScrollView
            contentContainerStyle={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          >
            {/* Header Section */}
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <Text style={styles.overviewSubtitle}>Welcome back, Admin. Here's what's happening today.</Text>
            </View>

            {/* Blinking Urgent Action Banner if new bookings waiting */}
            {bookings.filter(b => b.status === 'pending').length > 0 && (
              <Animated.View style={[styles.blinkingAlertCard, { opacity: blinkingAnim }]}>
                <View style={styles.blinkingIconBox}>
                  <Ionicons name="notifications" size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.blinkingAlertTitle}>
                    🚨 NEW SEAT BOOKING DETECTED!
                  </Text>
                  <Text style={styles.blinkingAlertSub}>
                    {bookings.filter(b => b.status === 'pending').length} booking request(s) waiting for approval.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.blinkingReviewBtn}
                  onPress={() => setActiveTab('Bookings')}
                >
                  <Text style={styles.blinkingReviewBtnText}>Review →</Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Pricing & Discount Offers Management Banner */}
            <TouchableOpacity
              style={styles.pricingQuickBanner}
              onPress={() => setPricingModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.pricingQuickLeft}>
                <View style={styles.pricingIconBadge}>
                  <Ionicons name="pricetag" size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.pricingQuickTitle}>Seat Pricing & Discounts</Text>
                    {discountActive && (
                      <View style={styles.discountActiveBadge}>
                        <Text style={styles.discountActiveBadgeText}>{discountPercent}% OFF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.pricingQuickSub}>
                    Monthly: ₹{discountActive ? Math.round(Number(monthlyBasePrice) * (1 - Number(discountPercent)/100)) : monthlyBasePrice}
                    {discountActive ? ` (Was ₹${monthlyBasePrice})` : ''} • Weekly: ₹{weeklyPrice} • Daily: ₹{dailyPrice}
                  </Text>
                </View>
              </View>
              <View style={styles.pricingEditBtn}>
                <Text style={styles.pricingEditBtnText}>Change →</Text>
              </View>
            </TouchableOpacity>

            {/* Bento Grid - 4 KPI Cards */}
            <View style={styles.kpiGrid}>
              {/* KPI 1: Total Students */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(0, 104, 91, 0.12)' }]}>
                    <Ionicons name="people" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.trendChip}>
                    <Ionicons name="trending-up" size={12} color={COLORS.secondary} />
                    <Text style={styles.trendChipText}>12%</Text>
                  </View>
                </View>
                <Text style={styles.kpiLabel}>Total Students</Text>
                <Text style={styles.kpiValue}>{statsData?.totalStudents || 1248}</Text>
              </View>

              {/* KPI 2: Active Now */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: COLORS.secondaryContainer }]}>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.onSecondaryContainer} />
                  </View>
                </View>
                <Text style={styles.kpiLabel}>Active Now</Text>
                <Text style={styles.kpiValue}>{statsData?.activeBookings || 342}</Text>
              </View>

              {/* KPI 3: Pending Approvals */}
              <View style={styles.kpiCard}>
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(180, 91, 66, 0.15)' }]}>
                    <Ionicons name="time" size={20} color={COLORS.tertiary} />
                  </View>
                  <View style={styles.actionReqChip}>
                    <Text style={styles.actionReqText}>Requires action</Text>
                  </View>
                </View>
                <Text style={styles.kpiLabel}>Pending Approvals</Text>
                <Text style={styles.kpiValue}>{statsData?.pendingApprovals || bookings.filter(b => b.status === 'pending').length || 24}</Text>
              </View>

              {/* KPI 4: Monthly Revenue (Clickable to open breakdown ledger!) */}
              <TouchableOpacity 
                style={[styles.kpiCard, styles.revenueCard]}
                onPress={() => {
                  fetchLogs();
                  setRevenueModalVisible(true);
                }}
                activeOpacity={0.82}
              >
                <View style={styles.kpiTopRow}>
                  <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                    <Ionicons name="cash" size={20} color="#ffffff" />
                  </View>
                  <View style={[styles.trendChip, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                    <Ionicons name="receipt-outline" size={12} color="#ffffff" />
                    <Text style={[styles.trendChipText, { color: '#ffffff', fontWeight: '800' }]}>Details →</Text>
                  </View>
                </View>
                <Text style={[styles.kpiLabel, { color: 'rgba(255, 255, 255, 0.85)' }]}>Monthly Revenue</Text>
                <Text style={[styles.kpiValue, { color: '#ffffff' }]}>
                  ₹{(statsData?.revenue !== undefined ? statsData.revenue : (paymentLogs.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0)).toLocaleString()}
                </Text>
                <Text style={styles.kpiTapHint}>
                  👆 Tap to view who paid & details
                </Text>
              </TouchableOpacity>
            </View>

            {/* Live Occupancy Section */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>Live Occupancy</Text>
                <TouchableOpacity onPress={() => setActiveTab('Live')}>
                  <Text style={styles.cardActionText}>View Map</Text>
                </TouchableOpacity>
              </View>
              {occupancyData.length > 0 ? (
                occupancyData.map((room, idx) => (
                  <View key={idx} style={styles.occupancyItem}>
                    <View style={styles.occupancyTop}>
                      <Text style={styles.occupancyRoomName}>{room.room || 'Main Hall'}</Text>
                      <Text style={styles.occupancyCount}>
                        {room.occupied} / {room.total} ({room.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(room.percentage, 100)}%` }]} />
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={styles.occupancyItem}>
                    <View style={styles.occupancyTop}>
                      <Text style={styles.occupancyRoomName}>Downtown Hub (Branch A)</Text>
                      <Text style={styles.occupancyCount}>85 / 100 Seats (85%)</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: '85%' }]} />
                    </View>
                  </View>
                  <View style={styles.occupancyItem}>
                    <View style={styles.occupancyTop}>
                      <Text style={styles.occupancyRoomName}>North Campus (Branch B)</Text>
                      <Text style={styles.occupancyCount}>42 / 120 Seats (35%)</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: '35%', backgroundColor: COLORS.secondary }]} />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Revenue Split Card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Revenue Split</Text>
              <View style={styles.revenueSplitRow}>
                <View style={styles.revenuePillBox}>
                  <View style={[styles.revenueDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.revenuePillText}>Online: 72%</Text>
                </View>
                <View style={styles.revenuePillBox}>
                  <View style={[styles.revenueDot, { backgroundColor: COLORS.secondaryContainer }]} />
                  <Text style={styles.revenuePillText}>Cash/Desk: 28%</Text>
                </View>
              </View>
            </View>

            {/* Live Activity Feed */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.cardSectionTitle}>Live Activity Feed</Text>
                {bookings.filter(b => b.status === 'pending').length > 0 && (
                  <View style={styles.livePulseChip}>
                    <Animated.View style={[styles.livePulseDot, { opacity: blinkingAnim }]} />
                    <Text style={styles.livePulseChipText}>LIVE</Text>
                  </View>
                )}
              </View>

              {/* Pending bookings blinking at top of feed */}
              {bookings.filter(b => b.status === 'pending').map((pb) => (
                <View key={`live-feed-pb-${pb.id}`} style={styles.activityRowPending}>
                  <Animated.View style={[styles.activityDot, { backgroundColor: '#ef4444', opacity: blinkingAnim }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityEventPending}>
                      ⚡ Seat {pb.seat} ({pb.room || 'Silent Zone'}) booked by {pb.student?.name || 'Student'}
                    </Text>
                    <Text style={styles.activityTime}>₹{pb.amount} ({pb.planType}) • Pending Admin Approval</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.quickApproveMiniBtn}
                    onPress={() => handleOpenApprovalModal(pb)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickApproveMiniBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {recentActivity.length > 0 ? (
                recentActivity.map((act, index) => (
                  <View key={index} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityDot,
                        act.type === 'booking' && { backgroundColor: COLORS.warning },
                        act.type === 'payment' && { backgroundColor: COLORS.primary },
                        act.type === 'checkin' && { backgroundColor: COLORS.secondary },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityEvent}>{act.event}</Text>
                      <Text style={styles.activityTime}>{act.time}</Text>
                    </View>
                  </View>
                ))
              ) : bookings.filter(b => b.status === 'pending').length === 0 ? (
                <Text style={styles.emptyText}>No recent activity logged</Text>
              ) : null}
            </View>
          </ScrollView>
        );

      // 2. BOOKINGS TAB
      case 'Bookings':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.filterContainer}>
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterBtn, bookingFilter === filter && styles.filterBtnActive]}
                  onPress={() => setBookingFilter(filter)}
                >
                  <Text style={[styles.filterBtnText, bookingFilter === filter && styles.filterBtnTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              renderItem={({ item }) => (
                <View style={styles.bookingItemCard}>
                  <View style={styles.bookingHeaderRow}>
                    <View style={styles.bookingStudentInfo}>
                      <Text style={styles.bookingStudentName}>{item.student?.name || 'Student'}</Text>
                      <Text style={styles.bookingStudentEmail}>{item.student?.email || 'N/A'}</Text>
                      {item.student?.phone && <Text style={styles.bookingStudentPhone}>📞 {item.student.phone}</Text>}
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'approved' && styles.statusApproved,
                        item.status === 'pending' && styles.statusPending,
                        item.status === 'rejected' && styles.statusRejected,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.bookingDetailsGrid}>
                    <View>
                      <Text style={styles.detailLabel}>SEAT & ROOM</Text>
                      <Text style={styles.detailValue}>
                        Seat {item.seat} • {item.room}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailLabel}>AMOUNT & PLAN</Text>
                      <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                        ₹{item.amount} ({item.planType})
                      </Text>
                    </View>
                  </View>
                  {item.status === 'pending' ? (
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleBookingAction(item.id, 'reject')}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleOpenApprovalModal(item)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                        <Text style={styles.approveButtonText}>Approve & Collect</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.actionButtonsRow, { justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>Payment Confirmed</Text>
                      </View>
                      {item.student?.phone && (
                        <TouchableOpacity
                          style={styles.whatsappActionBtn}
                          onPress={() => sendWhatsAppNotification(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color="#22c55e" />
                          <Text style={styles.whatsappActionBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No {bookingFilter.toLowerCase()} bookings</Text>}
            />
          </View>
        );

      // 3. FACILITIES TAB (Branches -> Rooms -> Seats with Edit & Photo Showcase)
      case 'Facilities':
        return (
          <View style={{ flex: 1 }}>
            {/* Top Level Navigation Header */}
            <View style={styles.facilityNavRow}>
              {facilityLevel !== 'branches' ? (
                <TouchableOpacity
                  style={styles.backLevelBtn}
                  onPress={() => {
                    if (facilityLevel === 'seats') setFacilityLevel('rooms');
                    else if (facilityLevel === 'rooms') setFacilityLevel('branches');
                  }}
                >
                  <Ionicons name="arrow-back" size={18} color="#ffffff" />
                  <Text style={styles.backLevelText}>
                    {facilityLevel === 'seats' ? selectedBranch?.name : 'All Branches'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.facilityLevelTitle}>Library Facilities</Text>
              )}

              <TouchableOpacity
                style={styles.addLevelBtn}
                onPress={() => {
                  if (facilityLevel === 'branches') handleOpenBranchModal();
                  else if (facilityLevel === 'rooms') handleOpenRoomModal();
                  else if (facilityLevel === 'seats') setAddSeatModal(true);
                }}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
                <Text style={styles.addLevelBtnText}>
                  {facilityLevel === 'branches' && 'Add Branch'}
                  {facilityLevel === 'rooms' && 'Add Room'}
                  {facilityLevel === 'seats' && 'Add Seats'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* LEVEL 1: Branches List */}
            {facilityLevel === 'branches' && (
              <FlatList
                data={branchesList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.facilityCard}>
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.facilityImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.facilityImage, styles.facilityImagePlaceholder]}>
                        <Ionicons name="business-outline" size={40} color="#525252" />
                      </View>
                    )}
                    <View style={styles.facilityCardBody}>
                      <View style={styles.facilityHeaderRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.facilityCardTitle}>{item.name}</Text>
                          <Text style={styles.facilityCardSub}>📍 {item.address || 'Address not set'} • {item.city || 'City'}</Text>
                        </View>
                        <View style={styles.facilityActionGroup}>
                          <TouchableOpacity
                            style={styles.editIconBtn}
                            onPress={() => handleOpenBranchModal(item)}
                          >
                            <Ionicons name="pencil" size={16} color="#0d9488" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteIconBtn}
                            onPress={() => handleDeleteBranch(item.id, item.name)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.facilityCardStats}>
                        <Text style={styles.facilityStatPill}>🚪 {item.roomCount} Rooms</Text>
                        <Text style={styles.facilityStatPill}>🪑 {item.totalSeats} Total Seats</Text>
                        <TouchableOpacity
                          style={styles.managePillBtn}
                          onPress={() => {
                            setSelectedBranch(item);
                            setFacilityLevel('rooms');
                          }}
                        >
                          <Text style={styles.managePillText}>Manage Rooms →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No branches configured</Text>}
              />
            )}

            {/* LEVEL 2: Rooms List */}
            {facilityLevel === 'rooms' && (
              <FlatList
                data={roomsList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.facilityCard}>
                    {item.photo ? (
                      <Image source={{ uri: item.photo }} style={styles.facilityImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.facilityImage, styles.facilityImagePlaceholder]}>
                        <Ionicons name="easel-outline" size={40} color="#525252" />
                      </View>
                    )}
                    <View style={styles.facilityCardBody}>
                      <View style={styles.facilityHeaderRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.facilityCardTitle}>{item.name}</Text>
                          <Text style={styles.facilityCardSub}>Capacity: {item.capacity} Seats • Configured: {item.seatCount} Seats</Text>
                        </View>
                        <View style={styles.facilityActionGroup}>
                          <TouchableOpacity
                            style={styles.editIconBtn}
                            onPress={() => handleOpenRoomModal(item)}
                          >
                            <Ionicons name="pencil" size={16} color="#0d9488" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteIconBtn}
                            onPress={() => handleDeleteRoom(item.id, item.name)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.facilityCardStats}>
                        <TouchableOpacity
                          style={[styles.managePillBtn, { width: '100%', alignItems: 'center' }]}
                          onPress={() => {
                            setSelectedRoom(item);
                            setFacilityLevel('seats');
                          }}
                        >
                          <Text style={styles.managePillText}>🪑 Configure & Lock Seats →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No rooms in this branch</Text>}
              />
            )}

            {/* LEVEL 3: Seats List & 🔒 Lock/Block Controls */}
            {facilityLevel === 'seats' && (
              <ScrollView
                contentContainerStyle={styles.tabScroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              >
                <Text style={styles.subHelpText}>Tap 🔒 to Lock (Block) or 🔓 to Unlock any seat in real-time</Text>

                <View style={styles.seatManageGrid}>
                  {roomSeats.map((seat) => {
                    const isBlocked = seat.status === 'blocked' || seat.rawStatus === 'BLOCKED';
                    const isBooked = seat.status === 'booked';

                    return (
                      <View
                        key={seat.id}
                        style={[
                          styles.seatManageCard,
                          isBlocked && styles.seatManageCardBlocked,
                          isBooked && styles.seatManageCardBooked,
                        ]}
                      >
                        <View style={styles.seatManageHeader}>
                          <Text style={[styles.seatManageNum, isBlocked && { color: '#ef4444' }]}>
                            {seat.seatNumber}
                          </Text>
                          <View
                            style={[
                              styles.statusPill,
                              isBlocked ? styles.statusRejected : isBooked ? styles.statusPending : styles.statusApproved,
                            ]}
                          >
                            <Text style={styles.statusPillText}>
                              {isBlocked ? 'LOCKED' : isBooked ? 'BOOKED' : 'OPEN'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.seatManageActions}>
                          {isBlocked ? (
                            <TouchableOpacity
                              style={styles.seatUnlockBtn}
                              onPress={() => handleSeatAction(seat, 'UNBLOCK')}
                            >
                              <Ionicons name="lock-open-outline" size={13} color="#22c55e" />
                              <Text style={styles.seatUnlockBtnText}>Unlock</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.seatLockBtn}
                              onPress={() => handleSeatAction(seat, 'BLOCK')}
                            >
                              <Ionicons name="lock-closed-outline" size={13} color="#ef4444" />
                              <Text style={styles.seatLockBtnText}>Lock</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.seatDeleteBtn}
                            onPress={() => handleSeatAction(seat, 'DELETE')}
                          >
                            <Ionicons name="trash-outline" size={13} color="#8e8e93" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        );

      // 4. LIVE SEATS VISUALIZER TAB
      case 'Live':
        const filteredSeats = liveRoomFilter === 'ALL'
          ? liveSeats
          : liveSeats.filter(s => s.roomId === liveRoomFilter);

        return (
          <ScrollView
            contentContainerStyle={styles.tabScroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
          >
            {/* Overall Stat Pills */}
            <View style={styles.liveStatsRow}>
              <View style={[styles.liveStatPill, { backgroundColor: '#1c1c1e' }]}>
                <Text style={styles.liveStatNum}>{liveStats?.total || 0}</Text>
                <Text style={styles.liveStatLabel}>Total Seats</Text>
              </View>
              <View style={[styles.liveStatPill, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
                <Text style={[styles.liveStatNum, { color: '#0d9488' }]}>{liveStats?.available || 0}</Text>
                <Text style={styles.liveStatLabel}>Available</Text>
              </View>
              <View style={[styles.liveStatPill, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Text style={[styles.liveStatNum, { color: '#ef4444' }]}>{liveStats?.occupied || 0}</Text>
                <Text style={styles.liveStatLabel}>Booked/Occupied</Text>
              </View>
            </View>

            {/* SECTION 1: LIBRARY-WISE BREAKDOWN */}
            <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 8 }]}>🏛️ Library-Wise Seat Breakdown</Text>
            {libraryStats.length > 0 ? (
              libraryStats.map((b) => (
                <View key={`lib-stat-${b.id}`} style={styles.libraryBreakdownCard}>
                  <View style={styles.libraryBreakdownHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.libraryBreakdownTitle}>{b.name}</Text>
                      <Text style={styles.libraryBreakdownCode}>Branch Code: {b.code}</Text>
                    </View>
                    <View style={styles.occupancyBadge}>
                      <Text style={styles.occupancyBadgeText}>{b.occupancyRate}% Booked</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(b.occupancyRate, 100)}%` }]} />
                  </View>

                  <View style={styles.breakdownMetricsRow}>
                    <Text style={styles.metricText}>🪑 Total: <Text style={styles.boldNum}>{b.total}</Text></Text>
                    <Text style={[styles.metricText, { color: '#ef4444' }]}>🔴 Booked: <Text style={styles.boldNum}>{b.occupied}</Text></Text>
                    <Text style={[styles.metricText, { color: '#0d9488' }]}>🟢 Free: <Text style={styles.boldNum}>{b.available}</Text></Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.libraryBreakdownCard}>
                <Text style={styles.libraryBreakdownTitle}>Sameer Library - Main Branch</Text>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${liveStats?.total > 0 ? Math.round((liveStats.occupied / liveStats.total) * 100) : 40}%` }]} />
                </View>
                <View style={styles.breakdownMetricsRow}>
                  <Text style={styles.metricText}>🪑 Total: <Text style={styles.boldNum}>{liveStats?.total || 30}</Text></Text>
                  <Text style={[styles.metricText, { color: '#ef4444' }]}>🔴 Booked: <Text style={styles.boldNum}>{liveStats?.occupied || 12}</Text></Text>
                  <Text style={[styles.metricText, { color: '#0d9488' }]}>🟢 Free: <Text style={styles.boldNum}>{liveStats?.available || 18}</Text></Text>
                </View>
              </View>
            )}

            {/* SECTION 2: ROOM-WISE BREAKDOWN & SELECTOR */}
            <Text style={[styles.sectionTitle, { marginTop: 18, marginBottom: 8 }]}>🚪 Room-Wise Seat Occupancy</Text>
            
            {/* Room Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.roomFilterPill, liveRoomFilter === 'ALL' && styles.roomFilterPillActive]}
                onPress={() => setLiveRoomFilter('ALL')}
              >
                <Text style={[styles.roomFilterPillText, liveRoomFilter === 'ALL' && styles.roomFilterPillTextActive]}>
                  All Rooms ({liveSeats.length})
                </Text>
              </TouchableOpacity>
              {roomStats.map((r) => (
                <TouchableOpacity
                  key={`filter-${r.id}`}
                  style={[styles.roomFilterPill, liveRoomFilter === r.id && styles.roomFilterPillActive]}
                  onPress={() => setLiveRoomFilter(r.id)}
                >
                  <Text style={[styles.roomFilterPillText, liveRoomFilter === r.id && styles.roomFilterPillTextActive]}>
                    {r.name} ({r.occupied}/{r.total})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Room Breakdown Stat Cards */}
            {roomStats.filter(r => liveRoomFilter === 'ALL' || r.id === liveRoomFilter).map((r) => (
              <View key={`room-stat-${r.id}`} style={styles.roomBreakdownCard}>
                <View style={styles.roomBreakdownHeader}>
                  <View>
                    <Text style={styles.roomBreakdownTitle}>{r.name}</Text>
                    <Text style={styles.roomBreakdownBranch}>📍 {r.branchName}</Text>
                  </View>
                  <View style={[styles.roomOccupancyPill, { backgroundColor: r.occupancyRate > 75 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 148, 136, 0.15)' }]}>
                    <Text style={[styles.roomOccupancyPillText, { color: r.occupancyRate > 75 ? '#ef4444' : '#0d9488' }]}>
                      {r.occupancyRate}% Full
                    </Text>
                  </View>
                </View>
                <View style={styles.breakdownMetricsRow}>
                  <Text style={styles.metricText}>Capacity: <Text style={styles.boldNum}>{r.total}</Text></Text>
                  <Text style={[styles.metricText, { color: '#ef4444' }]}>Booked: <Text style={styles.boldNum}>{r.occupied}</Text></Text>
                  <Text style={[styles.metricText, { color: '#0d9488' }]}>Available: <Text style={styles.boldNum}>{r.available}</Text></Text>
                </View>
              </View>
            ))}

            {/* Real-time Seat Grid */}
            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>🪑 Real-Time Seat Grid</Text>
            <Text style={styles.subHelpText}>Tap any occupied seat to view student details & WhatsApp contact</Text>

            <View style={styles.seatGrid}>
              {filteredSeats.map((seat) => {
                const isOccupied = seat.status === 'occupied';
                const isBlocked = seat.status === 'blocked';

                return (
                  <TouchableOpacity
                    key={seat.id}
                    style={[
                      styles.adminSeatCell,
                      isOccupied && styles.adminSeatOccupied,
                      isBlocked && styles.adminSeatBlocked,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (seat.occupant) {
                        setSelectedOccupant({
                          ...seat.occupant,
                          seatNumber: seat.seatNumber,
                          roomName: seat.roomName,
                        });
                        setOccupantModalVisible(true);
                      } else {
                        Alert.alert(`Seat ${seat.seatNumber}`, `Status: ${seat.status.toUpperCase()}\nRoom: ${seat.roomName}`);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.adminSeatText,
                        isOccupied && styles.adminSeatTextOccupied,
                        isBlocked && styles.adminSeatTextBlocked,
                      ]}
                    >
                      {seat.seatNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        );

      // 5. STUDENTS DIRECTORY TAB
      case 'Students':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search-outline" size={18} color="#8e8e93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students by name, email, phone..."
                placeholderTextColor="#8e8e93"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8e8e93" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.flatListContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.studentCardTop}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>{item.name?.charAt(0).toUpperCase() || 'S'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{item.name}</Text>
                      <Text style={styles.studentEmail}>{item.email}</Text>
                      {item.phone && <Text style={styles.studentPhone}>📞 {item.phone}</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteStudentBtn}
                      onPress={() => handleDeleteStudent(item.id, item.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.studentMetaRow}>
                    <View>
                      <Text style={styles.detailLabel}>COLLEGE / COURSE</Text>
                      <Text style={styles.detailValue}>
                        {item.college || 'N/A'} • {item.course || 'N/A'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.detailLabel}>TOTAL BOOKINGS</Text>
                      <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                        {item.totalBookings} Bookings
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No students found</Text>}
            />
          </View>
        );

      // 6. LOGS TAB
      case 'Logs':
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                style={[styles.subTabBtn, logsSubTab === 'Attendance' && styles.subTabBtnActive]}
                onPress={() => setLogsSubTab('Attendance')}
              >
                <Text style={[styles.subTabBtnText, logsSubTab === 'Attendance' && styles.subTabBtnTextActive]}>
                  Attendance Logs
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, logsSubTab === 'Payments' && styles.subTabBtnActive]}
                onPress={() => setLogsSubTab('Payments')}
              >
                <Text style={[styles.subTabBtnText, logsSubTab === 'Payments' && styles.subTabBtnTextActive]}>
                  Payment Transactions
                </Text>
              </TouchableOpacity>
            </View>

            {logsSubTab === 'Attendance' ? (
              <FlatList
                data={attendanceLogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logCardHeader}>
                      <View>
                        <Text style={styles.logStudentName}>{item.studentName}</Text>
                        <Text style={styles.logBranch}>{item.branch}</Text>
                      </View>
                      <View style={[styles.statusPill, item.status === 'Active' ? styles.statusPending : styles.statusApproved]}>
                        <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.logTimesRow}>
                      <Text style={styles.logTimeText}>In: {item.checkIn}</Text>
                      <Text style={styles.logTimeText}>Out: {item.checkOut}</Text>
                      <Text style={[styles.logTimeText, { color: '#0d9488', fontWeight: '700' }]}>{item.duration}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found</Text>}
              />
            ) : (
              <FlatList
                data={paymentLogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.flatListContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />}
                renderItem={({ item }) => (
                  <View style={styles.logCard}>
                    <View style={styles.logCardHeader}>
                      <View>
                        <Text style={styles.logStudentName}>{item.studentName}</Text>
                        <Text style={styles.logBranch}>Tx: {item.transactionId}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.paymentAmount}>₹{item.amount}</Text>
                        <Text style={styles.paymentPlan}>{item.plan} Plan</Text>
                      </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.logTimesRow}>
                      <Text style={styles.logTimeText}>{item.date}</Text>
                      <Text style={styles.logTimeText}>Via: {item.method?.toUpperCase() || 'RAZORPAY'}</Text>
                      <View style={[styles.statusPill, item.status === 'success' ? styles.statusApproved : styles.statusPending]}>
                        <Text style={styles.statusPillText}>{item.status?.toUpperCase() || 'SUCCESS'}</Text>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No payment records found</Text>}
              />
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {((activeTab as string) !== 'Overview' || facilityLevel !== 'branches') ? (
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => {
                if (activeTab === 'Facilities' && facilityLevel === 'seats') {
                  setFacilityLevel('rooms');
                } else if (activeTab === 'Facilities' && facilityLevel === 'rooms') {
                  setFacilityLevel('branches');
                } else {
                  setActiveTab('Overview');
                }
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              <Text style={styles.headerBackBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' }}
              style={styles.adminAvatarThumb}
            />
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerTitle}>Sameer Library</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {activeTab !== 'Overview' ? activeTab : 'Management System'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.pricingHeaderBtn}
            onPress={() => setPricingModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="pricetag" size={13} color="#ffffff" />
            <Text style={styles.pricingHeaderBtnText}>Prices</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notifBtn} 
            onPress={() => Alert.alert('Alerts', 'No pending system notifications.')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutIconBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Area */}
      <View style={styles.contentArea}>{renderTabContent()}</View>

      {/* Bottom Navigation Tab Bar (6 Core Tabs) */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Overview')}
        >
          <Ionicons name={activeTab === 'Overview' ? 'grid' : 'grid-outline'} size={18} color={activeTab === 'Overview' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Overview' && styles.tabButtonTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Bookings' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Bookings')}
        >
          <Ionicons name={activeTab === 'Bookings' ? 'file-tray-full' : 'file-tray-full-outline'} size={18} color={activeTab === 'Bookings' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Bookings' && styles.tabButtonTextActive]}>Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Facilities' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('Facilities');
            setFacilityLevel('branches');
          }}
        >
          <Ionicons name={activeTab === 'Facilities' ? 'business' : 'business-outline'} size={18} color={activeTab === 'Facilities' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Facilities' && styles.tabButtonTextActive]}>Facilities</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Live' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Live')}
        >
          <Ionicons name={activeTab === 'Live' ? 'easel' : 'easel-outline'} size={18} color={activeTab === 'Live' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Live' && styles.tabButtonTextActive]}>Live</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Students' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Students')}
        >
          <Ionicons name={activeTab === 'Students' ? 'people' : 'people-outline'} size={18} color={activeTab === 'Students' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Students' && styles.tabButtonTextActive]}>Students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'Logs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Logs')}
        >
          <Ionicons name={activeTab === 'Logs' ? 'receipt' : 'receipt-outline'} size={18} color={activeTab === 'Logs' ? '#0d9488' : '#8e8e93'} />
          <Text style={[styles.tabButtonText, activeTab === 'Logs' && styles.tabButtonTextActive]}>Logs</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL 1: Create or Edit Branch */}
      <Modal visible={branchModalVisible} animationType="slide" transparent={true} onRequestClose={() => setBranchModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setBranchModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBranchId ? 'Edit Branch' : 'Add New Branch'}</Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>BRANCH NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Sameer Library - Gomti Nagar"
                placeholderTextColor="#8e8e93"
                value={branchName}
                onChangeText={setBranchName}
              />
              
              {!editingBranchId && (
                <>
                  <Text style={styles.modalInputLabel}>BRANCH CODE</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. SL02"
                    placeholderTextColor="#8e8e93"
                    value={branchCode}
                    onChangeText={setBranchCode}
                    autoCapitalize="characters"
                  />
                </>
              )}

              <Text style={styles.modalInputLabel}>ADDRESS & CITY</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Address line"
                placeholderTextColor="#8e8e93"
                value={branchAddress}
                onChangeText={setBranchAddress}
              />
              <TextInput
                style={[styles.modalInput, { marginTop: 8 }]}
                placeholder="City (e.g. Lucknow)"
                placeholderTextColor="#8e8e93"
                value={branchCity}
                onChangeText={setBranchCity}
              />

              <Text style={styles.modalInputLabel}>LIBRARY PHOTO</Text>
              <TouchableOpacity 
                style={styles.mobileUploadBtn}
                onPress={handlePickBranchPhoto}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
                <Text style={styles.mobileUploadBtnText}>Upload Photo from Mobile (Camera/Gallery)</Text>
              </TouchableOpacity>
              {branchPhoto ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: branchPhoto }} style={styles.photoPreviewImg} resizeMode="cover" />
                  <Text style={styles.photoPreviewText}>Current Selected Library Photo</Text>
                </View>
              ) : null}

              <Text style={[styles.modalInputLabel, { marginTop: 10 }]}>OR CHOOSE PRESET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {PHOTO_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetCard, branchPhoto === preset.url && styles.presetCardActive]}
                    onPress={() => setBranchPhoto(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveBranch}>
              <Text style={styles.modalSubmitBtnText}>{editingBranchId ? 'Save Changes' : 'Create Branch'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Create or Edit Room */}
      <Modal visible={roomModalVisible} animationType="slide" transparent={true} onRequestClose={() => setRoomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRoomModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoomId ? `Edit Room` : `Add Room to ${selectedBranch?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setRoomModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInputLabel}>ROOM NAME</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Silent Study Zone, Discussion Hall"
                placeholderTextColor="#8e8e93"
                value={roomName}
                onChangeText={setRoomName}
              />

              <Text style={styles.modalInputLabel}>CAPACITY (SEATS)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 20"
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                value={roomCapacity}
                onChangeText={setRoomCapacity}
              />

              <Text style={styles.modalInputLabel}>ROOM PHOTO</Text>
              <TouchableOpacity 
                style={styles.mobileUploadBtn}
                onPress={handlePickRoomPhoto}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={18} color="#ffffff" />
                <Text style={styles.mobileUploadBtnText}>Upload Photo from Mobile (Camera/Gallery)</Text>
              </TouchableOpacity>
              {roomPhoto ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: roomPhoto }} style={styles.photoPreviewImg} resizeMode="cover" />
                  <Text style={styles.photoPreviewText}>Current Selected Room Photo</Text>
                </View>
              ) : null}

              <Text style={[styles.modalInputLabel, { marginTop: 10 }]}>OR CHOOSE ROOM PRESET</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                {PHOTO_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetCard, roomPhoto === preset.url && styles.presetCardActive]}
                    onPress={() => setRoomPhoto(preset.url)}
                  >
                    <Image source={{ uri: preset.url }} style={styles.presetImage} />
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveRoom}>
              <Text style={styles.modalSubmitBtnText}>{editingRoomId ? 'Save Changes' : 'Add Room'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Add Seats (Batch Generation) */}
      <Modal visible={addSeatModal} animationType="slide" transparent={true} onRequestClose={() => setAddSeatModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setAddSeatModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Generate Seats for {selectedRoom?.name}</Text>
              <TouchableOpacity onPress={() => setAddSeatModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalInputLabel}>NUMBER OF SEATS TO ADD</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 5, 10, 20"
              placeholderTextColor="#8e8e93"
              keyboardType="numeric"
              value={newSeatCount}
              onChangeText={setNewSeatCount}
            />
            <Text style={[styles.subHelpText, { marginTop: 8 }]}>
              Seats will be sequentially numbered automatically (e.g. S1, S2, S3...)
            </Text>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddSeats}>
              <Text style={styles.modalSubmitBtnText}>Generate Seats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Occupant Detail Sheet Modal */}
      <Modal visible={occupantModalVisible} animationType="slide" transparent={true} onRequestClose={() => setOccupantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOccupantModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seat Occupant Details</Text>
              <TouchableOpacity onPress={() => setOccupantModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            {selectedOccupant && (
              <View style={{ gap: 12, marginVertical: 12 }}>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>SEAT & ROOM</Text>
                  <Text style={[styles.detailValue, { color: '#0d9488', fontWeight: '700' }]}>
                    Seat {selectedOccupant.seatNumber} ({selectedOccupant.roomName})
                  </Text>
                </View>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>STUDENT NAME</Text>
                  <Text style={styles.detailValue}>{selectedOccupant.name}</Text>
                </View>
                <View style={styles.occupantRow}>
                  <Text style={styles.detailLabel}>EMAIL</Text>
                  <Text style={styles.detailValue}>{selectedOccupant.email}</Text>
                </View>
                {selectedOccupant.phone && (
                  <View style={styles.occupantRow}>
                    <Text style={styles.detailLabel}>MOBILE</Text>
                    <Text style={styles.detailValue}>📞 {selectedOccupant.phone}</Text>
                  </View>
                )}
                {selectedOccupant.phone && (
                  <TouchableOpacity
                    style={[styles.whatsappActionBtn, { width: '100%', justifyContent: 'center', marginTop: 10 }]}
                    onPress={() => sendWhatsAppNotification({
                      student: { name: selectedOccupant.name, phone: selectedOccupant.phone },
                      seat: selectedOccupant.seatNumber,
                      room: selectedOccupant.roomName,
                      planType: 'Active Session',
                      amount: 'Paid',
                    })}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                    <Text style={styles.whatsappActionBtnText}>Message on WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setOccupantModalVisible(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Approve Booking with Online / Offline Payment */}
      <Modal
        visible={approvalModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setApprovalModalVisible(false)} />
          <View style={[styles.modalContent, { maxWidth: 440 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Approve Booking & Collect Fee</Text>
                <Text style={styles.modalSubTitle}>
                  Select how payment was received for this seat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setApprovalModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {selectedBookingToApprove && (
              <View style={styles.approveBookingInfoCard}>
                <View style={styles.approveInfoRow}>
                  <Text style={styles.approveInfoLabel}>Student:</Text>
                  <Text style={styles.approveInfoValue}>{selectedBookingToApprove.student?.name || 'Student'}</Text>
                </View>
                <View style={styles.approveInfoRow}>
                  <Text style={styles.approveInfoLabel}>Seat & Room:</Text>
                  <Text style={styles.approveInfoValue}>Seat {selectedBookingToApprove.seat} • {selectedBookingToApprove.room}</Text>
                </View>
                <View style={styles.approveInfoRow}>
                  <Text style={styles.approveInfoLabel}>Plan & Fee:</Text>
                  <Text style={[styles.approveInfoValue, { color: COLORS.primary, fontWeight: '800' }]}>
                    ₹{selectedBookingToApprove.amount} ({selectedBookingToApprove.planType})
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.paymentMethodPrompt}>Select Payment Receipt Mode:</Text>

            <TouchableOpacity
              style={styles.paymentOptionCard}
              onPress={() => handleApproveWithPayment('ONLINE')}
              activeOpacity={0.85}
            >
              <View style={[styles.paymentOptionIconBox, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}>
                <Ionicons name="card" size={24} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentOptionTitle}>Online Payment Received</Text>
                <Text style={styles.paymentOptionSub}>UPI, QR Code, GPay, PhonePe, or Netbanking</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentOptionCard, { marginTop: 12 }]}
              onPress={() => handleApproveWithPayment('OFFLINE')}
              activeOpacity={0.85}
            >
              <View style={[styles.paymentOptionIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                <Ionicons name="cash" size={24} color="#eab308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentOptionTitle}>Offline / Cash Payment Received</Text>
                <Text style={styles.paymentOptionSub}>Physical cash received at reception counter</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#eab308" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => setApprovalModalVisible(false)}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Monthly Revenue Breakdown & Full Payment Ledger */}
      <Modal
        visible={revenueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRevenueModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setRevenueModalVisible(false)} />
          <View style={[styles.modalContent, { maxHeight: '88%', paddingBottom: 16 }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>💰 Monthly Revenue Ledger</Text>
                <Text style={styles.modalSubTitle}>
                  Complete breakdown of all student fees & payments
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRevenueModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Total Revenue & Online/Offline Summary Card */}
            {(() => {
              const totalSum = paymentLogs.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
              const onlinePayments = paymentLogs.filter(p => (p.method || '').toLowerCase().includes('online') || (p.method || '').toLowerCase().includes('upi'));
              const offlinePayments = paymentLogs.filter(p => !((p.method || '').toLowerCase().includes('online') || (p.method || '').toLowerCase().includes('upi')));
              const onlineSum = onlinePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
              const offlineSum = offlinePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

              return (
                <View style={styles.revenueLedgerSummaryCard}>
                  <View style={styles.revenueLedgerTopRow}>
                    <View>
                      <Text style={styles.revenueLedgerLabel}>TOTAL REVENUE COLLECTED</Text>
                      <Text style={styles.revenueLedgerBigValue}>₹{totalSum.toLocaleString()}</Text>
                    </View>
                    <View style={styles.revenueLedgerCountChip}>
                      <Ionicons name="receipt" size={14} color={COLORS.primary} />
                      <Text style={styles.revenueLedgerCountText}>{paymentLogs.length} Receipts</Text>
                    </View>
                  </View>

                  <View style={styles.revenueSplitDivider} />

                  <View style={styles.revenueSplitRowBoxes}>
                    <View style={styles.revenueSplitBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="card" size={14} color={COLORS.primary} />
                        <Text style={styles.revenueSplitBoxTitle}>Online (UPI/QR)</Text>
                      </View>
                      <Text style={[styles.revenueSplitBoxAmount, { color: COLORS.primary }]}>
                        ₹{onlineSum.toLocaleString()}
                      </Text>
                      <Text style={styles.revenueSplitBoxCount}>{onlinePayments.length} transactions</Text>
                    </View>

                    <View style={styles.revenueSplitBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="cash" size={14} color="#eab308" />
                        <Text style={styles.revenueSplitBoxTitle}>Offline (Cash)</Text>
                      </View>
                      <Text style={[styles.revenueSplitBoxAmount, { color: '#eab308' }]}>
                        ₹{offlineSum.toLocaleString()}
                      </Text>
                      <Text style={styles.revenueSplitBoxCount}>{offlinePayments.length} transactions</Text>
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Filter Tabs: ALL, ONLINE, OFFLINE */}
            <View style={styles.revenueFilterRow}>
              {(['ALL', 'ONLINE', 'OFFLINE'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.revenueFilterTab,
                    revenueFilter === mode && styles.revenueFilterTabActive,
                  ]}
                  onPress={() => setRevenueFilter(mode)}
                >
                  <Text
                    style={[
                      styles.revenueFilterTabText,
                      revenueFilter === mode && styles.revenueFilterTabTextActive,
                    ]}
                  >
                    {mode === 'ALL' ? 'All Payments' : mode === 'ONLINE' ? '💳 Online' : '💵 Cash/Offline'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Bar */}
            <View style={styles.revenueSearchBar}>
              <Ionicons name="search" size={16} color="#8e8e93" />
              <TextInput
                style={styles.revenueSearchInput}
                placeholder="Search by student, seat, or phone..."
                placeholderTextColor="#8e8e93"
                value={revenueSearch}
                onChangeText={setRevenueSearch}
              />
              {revenueSearch ? (
                <TouchableOpacity onPress={() => setRevenueSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#8e8e93" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Payment List */}
            {(() => {
              const filtered = paymentLogs.filter((p) => {
                const isOnline = (p.method || '').toLowerCase().includes('online') || (p.method || '').toLowerCase().includes('upi');
                if (revenueFilter === 'ONLINE' && !isOnline) return false;
                if (revenueFilter === 'OFFLINE' && isOnline) return false;
                if (revenueSearch) {
                  const q = revenueSearch.toLowerCase();
                  const matchName = (p.studentName || '').toLowerCase().includes(q);
                  const matchSeat = (p.seatNumber || '').toLowerCase().includes(q);
                  const matchPhone = (p.studentPhone || '').toLowerCase().includes(q);
                  const matchRoom = (p.roomName || '').toLowerCase().includes(q);
                  return matchName || matchSeat || matchPhone || matchRoom;
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={44} color="#8e8e93" />
                    <Text style={{ color: '#8e8e93', marginTop: 10, fontSize: 13 }}>
                      No payments found matching criteria
                    </Text>
                  </View>
                );
              }

              return (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {filtered.map((item, idx) => {
                    const isOnline = (item.method || '').toLowerCase().includes('online') || (item.method || '').toLowerCase().includes('upi');

                    return (
                      <View key={item.id || idx} style={styles.paymentDetailCard}>
                        {/* Top: Student Name, Avatar & Amount */}
                        <View style={styles.paymentDetailTopRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[styles.studentAvatarCircle, { backgroundColor: isOnline ? 'rgba(13, 148, 136, 0.15)' : 'rgba(234, 179, 8, 0.15)' }]}>
                              <Ionicons name="person" size={16} color={isOnline ? COLORS.primary : '#eab308'} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.paymentStudentName} numberOfLines={1}>
                                {item.studentName}
                              </Text>
                              {item.studentPhone ? (
                                <Text style={styles.paymentStudentContact}>
                                  📞 {item.studentPhone} {item.studentEmail ? `• ${item.studentEmail}` : ''}
                                </Text>
                              ) : (
                                <Text style={styles.paymentStudentContact}>{item.studentEmail || 'N/A'}</Text>
                              )}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.paymentAmountText}>₹{item.amount}</Text>
                            <View style={[styles.methodBadge, { backgroundColor: isOnline ? 'rgba(13, 148, 136, 0.15)' : 'rgba(234, 179, 8, 0.15)' }]}>
                              <Text style={[styles.methodBadgeText, { color: isOnline ? COLORS.primary : '#eab308' }]}>
                                {isOnline ? '💳 Online (UPI)' : '💵 Cash/Offline'}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Mid: Seat & Date Info */}
                        <View style={styles.paymentDetailInfoBox}>
                          <View style={styles.paymentInfoCol}>
                            <Text style={styles.paymentDetailLabel}>SEAT & ROOM</Text>
                            <Text style={styles.paymentDetailVal}>
                              🪑 Seat {item.seatNumber} • {item.roomName || 'Silent Zone'}
                            </Text>
                          </View>
                          <View style={[styles.paymentInfoCol, { alignItems: 'flex-end' }]}>
                            <Text style={styles.paymentDetailLabel}>PLAN & DATE</Text>
                            <Text style={styles.paymentDetailVal}>
                              {item.plan} • {item.date} {item.time ? `(${item.time})` : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Bottom: Transaction Reference & WhatsApp Receipt button */}
                        <View style={styles.paymentDetailBottomRow}>
                          <Text style={styles.paymentTxnRef} numberOfLines={1}>
                            Ref: {item.transactionId}
                          </Text>
                          {item.studentPhone && (
                            <TouchableOpacity
                              style={styles.receiptWhatsAppBtn}
                              onPress={() => sendReceiptWhatsApp(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="logo-whatsapp" size={13} color="#22c55e" />
                              <Text style={styles.receiptWhatsAppBtnText}>Send Receipt</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              );
            })()}

            <TouchableOpacity
              style={[styles.modalCloseBtn, { marginTop: 12 }]}
              onPress={() => setRevenueModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close Ledger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 7: Set Pricing & Discount Offers */}
      <Modal
        visible={pricingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPricingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPricingModalVisible(false)} />
          <View style={[styles.modalContent, { maxHeight: '88%', paddingBottom: 16 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>🏷️ Seat Pricing & Offers</Text>
                <Text style={styles.modalSubTitle}>
                  Change monthly prices & launch student discount offers
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Live Preview Box */}
              <View style={styles.pricingLivePreviewBox}>
                <Text style={styles.pricingPreviewLabel}>STUDENT APP PREVIEW</Text>
                <View style={styles.pricingPreviewRow}>
                  <View>
                    <Text style={styles.pricingPreviewPlan}>Monthly Seat Membership</Text>
                    {discountActive && Number(discountPercent) > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={styles.pricingOriginalStrikethrough}>₹{monthlyBasePrice}</Text>
                        <Text style={styles.pricingDiscountedBig}>
                          ₹{Math.round(Number(monthlyBasePrice) * (1 - Number(discountPercent) / 100))}
                        </Text>
                        <View style={styles.discountBadgeSmall}>
                          <Text style={styles.discountBadgeSmallText}>{discountPercent}% OFF</Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.pricingDiscountedBig}>₹{monthlyBasePrice} / month</Text>
                    )}
                  </View>
                </View>
                {discountActive ? (
                  <View style={styles.offerBannerPreviewBox}>
                    <Text style={styles.offerBannerPreviewText}>
                      🔥 {offerTitle || 'Special Discount Active!'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Monthly Base Price */}
              <Text style={styles.modalInputLabel}>REGULAR MONTHLY SEAT PRICE (₹)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1000, 1200, 800"
                placeholderTextColor="#8e8e93"
                keyboardType="numeric"
                value={monthlyBasePrice}
                onChangeText={setMonthlyBasePrice}
              />

              {/* Discount Offer Toggle */}
              <View style={styles.discountToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.discountToggleTitle}>Run Discount Offer 🔥</Text>
                  <Text style={styles.discountToggleSub}>
                    Show discounted price & promo banner to attract more students
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.discountToggleBtn,
                    discountActive ? styles.discountToggleBtnOn : styles.discountToggleBtnOff,
                  ]}
                  onPress={() => setDiscountActive(!discountActive)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.discountToggleBtnText}>
                    {discountActive ? 'ACTIVE (ON)' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Discount Percentage */}
              {discountActive ? (
                <>
                  <Text style={styles.modalInputLabel}>DISCOUNT PERCENTAGE (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 10, 20, 30"
                    placeholderTextColor="#8e8e93"
                    keyboardType="numeric"
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                  />

                  <Text style={styles.modalInputLabel}>OFFER BANNER / PROMO HEADLINE</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 52 }]}
                    placeholder="e.g. Limited Time Admission Offer: Flat 20% OFF!"
                    placeholderTextColor="#8e8e93"
                    value={offerTitle}
                    onChangeText={setOfferTitle}
                    multiline
                  />
                </>
              ) : null}

              {/* Other Plans: Weekly & Daily */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>WEEKLY PRICE (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="300"
                    placeholderTextColor="#8e8e93"
                    keyboardType="numeric"
                    value={weeklyPrice}
                    onChangeText={setWeeklyPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalInputLabel}>DAILY PASS (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="50"
                    placeholderTextColor="#8e8e93"
                    keyboardType="numeric"
                    value={dailyPrice}
                    onChangeText={setDailyPrice}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleSavePricing}
              disabled={savingPricing}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSubmitBtnText}>
                {savingPricing ? 'Saving Changes...' : 'Save & Apply Price Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminAvatarThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.secondaryContainer,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  versionBadge: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.tertiary,
  },
  logoutIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentArea: {
    flex: 1,
  },
  tabScroll: {
    padding: 16,
    paddingBottom: 30,
  },
  overviewHeader: {
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },
  overviewSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 32 - 12) / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' },
    }),
  },
  kpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.onSecondaryContainer,
  },
  actionReqChip: {
    backgroundColor: COLORS.tertiaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  actionReqText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.tertiary,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  occupancyItem: {
    marginBottom: 12,
  },
  occupancyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  occupancyRoomName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  occupancyCount: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  revenueSplitRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  revenuePillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  revenuePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityEvent: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  activityTime: {
    color: COLORS.outline,
    fontSize: 10,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 30,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  bookingItemCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  bookingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingStudentInfo: {
    flex: 1,
    marginRight: 8,
  },
  bookingStudentName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  bookingStudentEmail: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  bookingStudentPhone: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 10,
  },
  bookingDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: COLORS.outline,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  rejectButtonText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: '700',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusApproved: {
    backgroundColor: COLORS.secondaryContainer,
  },
  statusPending: {
    backgroundColor: COLORS.tertiaryFixed,
  },
  statusRejected: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  // Facilities Styles
  facilityNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLevelText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  facilityLevelTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  addLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addLevelBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  facilityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  facilityCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  facilityCardBody: {
    padding: 14,
  },
  facilityCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  facilityCardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  facilityCardSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  facilityActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  facilityActionBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  facilityActionBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Live Seats Grid
  liveSeatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
  },
  liveSeatCell: {
    width: (width - 32 - 32) / 5,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveSeatCellOccupied: {
    backgroundColor: COLORS.secondaryContainer,
    borderColor: COLORS.secondary,
  },
  liveSeatCellBlocked: {
    backgroundColor: COLORS.errorContainer,
    borderColor: COLORS.error,
  },
  adminSeatText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  adminSeatTextOccupied: {
    color: COLORS.onSecondaryContainer,
  },
  adminSeatTextBlocked: {
    color: COLORS.error,
  },
  // Students List
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  studentCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  studentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  studentName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  studentEmail: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  studentPhone: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  deleteStudentBtn: {
    padding: 6,
  },
  studentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Logs SubTabs
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subTabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subTabBtnText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  subTabBtnTextActive: {
    color: '#ffffff',
  },
  logCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logStudentName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  logBranch: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  logTimesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTimeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  paymentAmount: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  paymentPlan: {
    color: COLORS.outline,
    fontSize: 10,
    marginTop: 1,
  },
  tabBar: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabButtonActive: {},
  tabButtonText: {
    color: COLORS.outline,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Modal Styling
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 12,
    marginBottom: 14,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  modalInputLabel: {
    color: COLORS.outline,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  presetCard: {
    marginRight: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: 92,
  },
  presetCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  presetImage: {
    width: '100%',
    height: 52,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  presetText: {
    color: COLORS.text,
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  occupantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  modalCloseBtn: {
    backgroundColor: COLORS.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalCloseBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  subHelpText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  facilityImage: {
    width: '100%',
    height: 125,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  facilityImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  facilityActionGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  editIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(0, 104, 91, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  deleteIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  facilityCardStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  facilityStatPill: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  managePillBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  managePillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  seatManageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  seatManageCard: {
    width: (width - 42) / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  seatManageCardBlocked: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
  },
  seatManageCardBooked: {
    borderColor: COLORS.warning,
  },
  seatManageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seatManageNum: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  seatManageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  seatLockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  seatLockBtnText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: '700',
  },
  seatUnlockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 108, 76, 0.1)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  seatUnlockBtnText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  seatDeleteBtn: {
    padding: 6,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 6,
  },
  liveStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  liveStatPill: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  liveStatNum: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  liveStatLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  adminSeatCell: {
    width: (width - 64) / 5,
    height: 40,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  adminSeatOccupied: {
    backgroundColor: COLORS.secondaryContainer,
    borderColor: COLORS.secondary,
  },
  adminSeatBlocked: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderColor: COLORS.outline,
  },

  // Blinking alert styles
  blinkingAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    elevation: 3,
  },
  blinkingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blinkingAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  blinkingAlertSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  blinkingReviewBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  blinkingReviewBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },

  // Live Pulse styles
  livePulseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  livePulseChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
  },
  activityRowPending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 8,
    gap: 8,
  },
  activityEventPending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  quickApproveMiniBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quickApproveMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  // WhatsApp button
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  whatsappActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },

  // Mobile upload styles
  mobileUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginVertical: 8,
  },
  mobileUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  photoPreviewBox: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  photoPreviewImg: {
    width: '100%',
    height: 120,
  },
  photoPreviewText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceContainerLow,
  },

  // Library breakdown card
  libraryBreakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  libraryBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  libraryBreakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  libraryBreakdownCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  occupancyBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occupancyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  breakdownMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  boldNum: {
    fontWeight: '800',
    color: COLORS.text,
  },

  // Room filter pills
  roomFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  roomFilterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roomFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roomFilterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  roomBreakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  roomBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomBreakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  roomBreakdownBranch: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roomOccupancyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roomOccupancyPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Modal 5: Approval payment selection styles
  modalSubTitle: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  approveBookingInfoCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  approveInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveInfoLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  approveInfoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  paymentMethodPrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    gap: 12,
  },
  paymentOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentOptionSub: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
  cancelModalBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '600',
  },

  kpiTapHint: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // Revenue Ledger Modal Styles
  revenueLedgerSummaryCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    marginVertical: 10,
  },
  revenueLedgerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueLedgerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e8e93',
    letterSpacing: 0.5,
  },
  revenueLedgerBigValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#22c55e',
    marginTop: 2,
  },
  revenueLedgerCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  revenueLedgerCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  revenueSplitDivider: {
    height: 1,
    backgroundColor: '#2c2c2e',
    marginVertical: 10,
  },
  revenueSplitRowBoxes: {
    flexDirection: 'row',
    gap: 10,
  },
  revenueSplitBox: {
    flex: 1,
    backgroundColor: '#252528',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#323236',
  },
  revenueSplitBoxTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  revenueSplitBoxAmount: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  revenueSplitBoxCount: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  revenueFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  revenueFilterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1c1c1e',
    borderWidth: 1,
    borderColor: '#2c2c2e',
    alignItems: 'center',
  },
  revenueFilterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  revenueFilterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8e8e93',
  },
  revenueFilterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  revenueSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
    gap: 8,
    marginBottom: 10,
  },
  revenueSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#ffffff',
    padding: 0,
  },

  // Payment Detail Card
  paymentDetailCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  paymentDetailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentStudentContact: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 1,
  },
  paymentAmountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#22c55e',
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  paymentDetailInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#252528',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  paymentInfoCol: {
    flex: 1,
  },
  paymentDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8e8e93',
  },
  paymentDetailVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  paymentDetailBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#2c2c2e',
  },
  paymentTxnRef: {
    fontSize: 9,
    color: '#636366',
    flex: 1,
  },
  receiptWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  receiptWhatsAppBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86efac',
  },

  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pricingHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  pricingHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Pricing quick banner
  pricingQuickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  pricingQuickLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pricingIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingQuickTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  pricingQuickSub: {
    fontSize: 11,
    color: '#8e8e93',
    marginTop: 2,
  },
  pricingEditBtn: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  pricingEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  discountActiveBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountActiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },

  // Pricing modal styles
  pricingLivePreviewBox: {
    backgroundColor: '#252528',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#3a3a3e',
  },
  pricingPreviewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8e8e93',
    letterSpacing: 0.5,
  },
  pricingPreviewRow: {
    marginTop: 6,
  },
  pricingPreviewPlan: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  pricingOriginalStrikethrough: {
    fontSize: 14,
    color: '#ef4444',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  pricingDiscountedBig: {
    fontSize: 20,
    fontWeight: '800',
    color: '#22c55e',
  },
  discountBadgeSmall: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  offerBannerPreviewBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  offerBannerPreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f87171',
  },
  discountToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  discountToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  discountToggleSub: {
    fontSize: 10,
    color: '#8e8e93',
    marginTop: 2,
  },
  discountToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  discountToggleBtnOn: {
    backgroundColor: '#ef4444',
  },
  discountToggleBtnOff: {
    backgroundColor: '#3a3a3c',
  },
  discountToggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
});

export default AdminDashboard;
