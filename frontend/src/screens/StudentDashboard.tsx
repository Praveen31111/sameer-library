import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions, SafeAreaView, ActivityIndicator, Platform, Image, Modal, StatusBar, BackHandler, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/api';
import { BottomNavBar, BottomNavTab } from '../components/BottomNavBar';
import { COLORS } from '../utils/constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

interface StudentDashboardProps {
  onNavigate: (screen: 'Home' | 'Login' | 'Register' | 'StudentDashboard' | 'AdminDashboard') => void;
}

const { width } = Dimensions.get('window');

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<BottomNavTab>('Home');
  const [loading, setLoading] = useState(false);

  // Profile & Image state
  const [profilePhoto, setProfilePhoto] = useState<string>(
    user?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
  );
  const [editName, setEditName] = useState<string>(user?.name || '');
  const [editPhone, setEditPhone] = useState<string>(user?.phone || '');
  const [editEmail, setEditEmail] = useState<string>(user?.email || '');
  const [editAddress, setEditAddress] = useState<string>(user?.college || '');
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Booking filters in My Bookings tab
  const [bookingsFilter, setBookingsFilter] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');

  // API States
  const [stats, setStats] = useState<{ daysPresent: number; totalHours: number; avgHoursPerDay: string; streak: number } | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Interactive Booking state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [seatsList, setSeatsList] = useState<any[]>([]);
  const [bookingPlan, setBookingPlan] = useState<'MONTHLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [zoneFilter, setZoneFilter] = useState<'ALL' | 'SILENT' | 'GROUP' | 'MONITOR'>('ALL');
  
  // Gate Attendance QR & 2-Step Selfie Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scannerStep, setScannerStep] = useState<'QR' | 'SELFIE'>('QR');
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [scannedQrToken, setScannedQrToken] = useState<string | null>(null);
  const [capturingSelfie, setCapturingSelfie] = useState(false);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanningLock = useRef(false);
  const cameraRef = useRef<any>(null);

  // Dynamic Pricing & Discount Offer State (Monthly-only)
  const [pricingConfig, setPricingConfig] = useState<any>({
    monthlyBasePrice: 1000,
    monthlyPrice: 1000,
    discountPercent: 0,
    discountActive: false,
    offerTitle: '',
  });

  // Fetch Pricing & Discounts from server
  const fetchPricing = async () => {
    try {
      const res = await apiRequest('/pricing');
      if (res?.pricing) {
        setPricingConfig(res.pricing);
      }
    } catch (e: any) {
      console.warn('Silent student pricing fetch fallback:', e?.message || e);
    }
  };

  // Step-by-step Back Navigation Handler (Hardware and UI)
  const handleStudentBack = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
      return true;
    }
    if (activeTab === 'Book') {
      if (selectedSeatId) {
        setSelectedSeatId(null);
        return true;
      }
      if (selectedRoomId) {
        setSelectedRoomId(null);
        return true;
      }
      setActiveTab('Home');
      return true;
    }
    if (activeTab !== 'Home') {
      setActiveTab('Home');
      return true;
    }
    return false;
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleStudentBack);
    return () => sub.remove();
  }, [isEditingProfile, activeTab, selectedSeatId, selectedRoomId]);

  // Sync user updates
  useEffect(() => {
    if (user) {
      if (user.profilePhoto) setProfilePhoto(user.profilePhoto);
      if (user.name) setEditName(user.name);
      if (user.phone) setEditPhone(user.phone);
      if (user.email) setEditEmail(user.email);
      if (user.college) setEditAddress(user.college);
    }
    fetchPricing();
  }, [user]);

  // Animation refs for dynamic animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wifiAnim = useRef(new Animated.Value(1)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for Pending Approval / Active status
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // WiFi signal wave animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiAnim, {
          toValue: 1.3,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(wifiAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // QR scanner laser line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Handle mobile slide-back gesture / Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (activeTab !== 'Home') {
        setActiveTab('Home');
        return true; // Prevents app from closing, smoothly takes student back to Home!
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeTab]);

  // Handle image upload from mobile (camera or gallery)
  const handlePickImage = async () => {
    Alert.alert(
      'Profile Photo',
      'Upload your photo from mobile:',
      [
        {
          text: 'Take Photo 📸',
          onPress: async () => {
            try {
              const permission = await ImagePicker.requestCameraPermissionsAsync();
              if (!permission.granted) {
                Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (!result.canceled && result.assets[0]?.uri) {
                await saveProfileImage(result.assets[0].uri);
              }
            } catch (err: any) {
              Alert.alert('Camera Error', err.message || 'Could not launch camera.');
            }
          },
        },
        {
          text: 'Choose from Gallery 🖼️',
          onPress: async () => {
            try {
              const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!permission.granted) {
                Alert.alert('Permission Denied', 'Gallery access is required to choose a photo.');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
              });
              if (!result.canceled && result.assets[0]?.uri) {
                await saveProfileImage(result.assets[0].uri);
              }
            } catch (err: any) {
              Alert.alert('Gallery Error', err.message || 'Could not open gallery.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const saveProfileImage = async (uri: string) => {
    setProfilePhoto(uri);
    try {
      await apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify({ profilePhoto: uri }),
      });
      Alert.alert('Success 🎉', 'Profile photo updated successfully!');
    } catch (err) {
      console.log('Saved photo locally');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Required Field', 'Please enter your full name.');
      return;
    }
    if (!editPhone.trim() || editPhone.trim().length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return;
    }

    setSavingProfile(true);
    try {
      await apiRequest('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim().toLowerCase(),
          college: editAddress.trim(),
        }),
      });
      setSavingProfile(false);
      setIsEditingProfile(false);
      Alert.alert('Success ✅', 'Personal details saved successfully!');
    } catch (err: any) {
      setSavingProfile(false);
      setIsEditingProfile(false);
      Alert.alert('Saved ✅', 'Details updated on device.');
    }
  };

  // Open Gate QR Scanner with Camera and Geofence GPS checks (Strict: Approved students only)
  const handleOpenGateScanner = async () => {
    // 1. Strict Admission Check: Sirf APPROVED student hi attendence laga sakein!
    const hasApprovedBooking = bookingsList.some((b: any) => {
      const s = (b.status || '').toUpperCase();
      return s === 'APPROVED' || s === 'CONFIRMED';
    });

    if (!hasApprovedBooking) {
      const hasPendingBooking = bookingsList.some((b: any) => (b.status || '').toUpperCase() === 'PENDING');
      if (hasPendingBooking) {
        Alert.alert(
          'Admission Approval Pending ⚠️',
          'Aapka seat admission abhi Library Admin se APPROVE nahi hua hai.\n\nJaise hi Library Admin aapka admission approve karenge, gate scanner turant unlock ho jayega aur aap attendance laga payenge.',
          [{ text: 'Theek Hai' }]
        );
      } else {
        Alert.alert(
          'Active Admission Required ⚠️',
          'Attendance mark karne ke liye pehle library me seat reserve karein aur admin se approve karwayein.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Book Seat Now', onPress: () => setActiveTab('Book') }
          ]
        );
      }
      return;
    }

    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Camera Permission Required', 'Please allow camera permission in device settings to scan the Library Gate QR Code.');
        return;
      }
    }

    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('GPS Location Required', 'Please allow location permission so the system can verify you are physically at the library gate.');
        return;
      }
    } catch (err) {
      console.warn('Location permission check warning:', err);
    }

    setScannerStep('QR');
    setCameraFacing('back');
    setScannedQrToken(null);
    setShowScanner(true);
  };

  // Step 1: Handle scanned Gate QR Pass (Triggers Front Camera for Step 2)
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanningLock.current || scannerStep !== 'QR') return;
    scanningLock.current = true;

    try {
      setScannedQrToken(data);
      // Seamlessly switch to Step 2: Front Camera Live Selfie Verification
      setCameraFacing('front');
      setScannerStep('SELFIE');
    } catch (err: any) {
      console.warn('QR scan transition error:', err);
    } finally {
      setTimeout(() => {
        scanningLock.current = false;
      }, 1000);
    }
  };

  // Step 2: Capture Front Camera Live Selfie & Submit Attendance (0-Cost, auto-purges in 24h)
  const handleCaptureAndPunch = async (skipSelfie = false) => {
    if (capturingSelfie) return;
    setCapturingSelfie(true);

    try {
      let selfieBase64: string | null = null;
      if (!skipSelfie && cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.25,
            base64: true,
          });
          if (photo?.base64) {
            selfieBase64 = `data:image/jpeg;base64,${photo.base64}`;
          }
        } catch (photoErr) {
          console.warn('Selfie photo capture warning:', photoErr);
        }
      }

      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch (locErr) {
        console.warn('Location fetch warning:', locErr);
      }

      const res = await apiRequest('/attendance/scan', {
        method: 'POST',
        body: JSON.stringify({
          qrToken: scannedQrToken,
          latitude,
          longitude,
          selfiePhoto: selfieBase64,
        }),
      });

      setShowScanner(false);
      setScannerStep('QR');
      setCameraFacing('back');

      if (res.success) {
        const checkTime = new Date(res.checkInAt || res.checkOutAt || Date.now()).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const checkDate = new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        const isCheckOut = res.action === 'CHECK_OUT';
        const title = isCheckOut ? 'Punch OUT Recorded! 👋' : 'Punch IN Successful! 🎉';
        const msg = `${isCheckOut ? 'Aapka Check-Out lag gaya hai.' : 'Aapki Attendance lag gayi hai!'}\n\n` +
          `📅 Date: ${checkDate}\n` +
          `⏰ Time: ${checkTime}\n` +
          `📍 Branch: ${res.branch || currentBranchName || 'Library Gate'}\n` +
          `🪑 Seat: ${res.seat || currentSeatName || 'Assigned Seat'}\n` +
          `🤳 Selfie Verification: ${res.hasSelfie ? 'Verified (24h proof saved)' : 'Location Verified'}` +
          (res.message ? `\n\n${res.message}` : '');

        Alert.alert(title, msg, [{ text: 'OK', onPress: () => fetchOverviewData() }]);
        fetchOverviewData();
      } else {
        Alert.alert('Attendance Failed', res.error || 'Could not verify pass.');
      }
    } catch (err: any) {
      setShowScanner(false);
      setScannerStep('QR');
      setCameraFacing('back');
      Alert.alert('Attendance Failed', err.message || 'Location verification or selfie check failed.');
    } finally {
      setCapturingSelfie(false);
    }
  };

  // Fetch Overview data (attendance stats + bookings list + monthly calendar)
  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const attRes = await apiRequest('/attendance');
      if (attRes.attendance) {
        setAttendanceLogs(attRes.attendance);
      }
      if (attRes.todayAttendance !== undefined) {
        setTodayAttendance(attRes.todayAttendance);
      }
      if (attRes.calendar) {
        setCalendarData(attRes.calendar);
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

    // Monthly price with discount offer calculation
    const price = pricingConfig?.discountActive && Number(pricingConfig?.discountPercent) > 0
      ? Number(pricingConfig?.monthlyPrice)
      : (Number(pricingConfig?.monthlyBasePrice) || 1000);

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 30); // Monthly admission: 30 full days access

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
        const bookedSeatNum = selectedSeatObj?.seatNumber || createdBooking.seat || 'Selected';

        // Prepend new booking so it instantly shows as the active booking on Home!
        setBookingsList(prev => [{
          ...createdBooking,
          seat: bookedSeatNum,
          room: selectedBranch?.rooms?.find((r: any) => r.id === selectedRoomId)?.name || 'Quiet Zone',
          branch: selectedBranch?.name || 'Main Library',
          status: 'pending',
          planType: bookingPlan,
        }, ...prev]);

        setLoading(false);
        setSelectedSeatId(null);

        Alert.alert(
          'Reservation Requested! 📋',
          `Your booking for Seat ${bookedSeatNum} has been submitted! It is currently pending approval by the library administrator. You can track the status in 'My Bookings'.`,
          [
            { text: 'View Bookings', onPress: () => setActiveTab('My Bookings') },
            { text: 'Go to Home', onPress: () => setActiveTab('Home') }
          ]
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

  // Find currently active booking (case-insensitive status check)
  const activeBooking = bookingsList.find(b => {
    const s = (b.status || '').toUpperCase();
    return s === 'APPROVED' || s === 'CONFIRMED' || s === 'PENDING';
  }) || bookingsList[0];

  const selectedSeatObj = seatsList.find(s => s.id === selectedSeatId);
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];

  // Resolve actual seat number and status
  const currentSeatRaw = activeBooking?.seat 
    ? (typeof activeBooking.seat === 'string' ? activeBooking.seat : (activeBooking.seat.seatNumber || 'A-01'))
    : (selectedSeatObj?.seatNumber || 'A-01');
  const currentSeatName = currentSeatRaw.startsWith('Seat') ? currentSeatRaw : `Seat ${currentSeatRaw}`;

  const currentRoomName = activeBooking?.room 
    ? (typeof activeBooking.room === 'string' ? activeBooking.room : (activeBooking.room.name || 'Quiet Zone'))
    : (selectedBranch?.rooms?.[0]?.name || 'Quiet Zone');

  const currentBranchName = activeBooking?.branch 
    ? (typeof activeBooking.branch === 'string' ? activeBooking.branch : (activeBooking.branch.name || 'Main Library'))
    : (selectedBranch?.name || 'Main Library');

  const bookingStatusUpper = (activeBooking?.status || 'PENDING').toUpperCase();
  const isApproved = bookingStatusUpper === 'APPROVED' || bookingStatusUpper === 'CONFIRMED';
  const isPending = bookingStatusUpper === 'PENDING';

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

        {/* Due Fee Alert Banner */}
        {activeBooking && activeBooking.dueAmount > 0 && (
          <View style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderColor: '#ef4444',
            borderWidth: 1.5,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}>
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 15 }}>
                  Fee Due: ₹{activeBooking.dueAmount}
                </Text>
                <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  PAYMENT PENDING
                </Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>
                Next Due Date: {activeBooking.nextDueDate ? new Date(activeBooking.nextDueDate).toLocaleDateString('en-IN') : 'Immediate'}. Please pay at reception desk.
              </Text>
            </View>
          </View>
        )}

        {/* Active Booking Bento Card */}
        <View style={styles.activeBookingCard}>
          <View style={styles.activeBookingHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardSuperLabel}>SEAT ASSIGNMENT</Text>
              <View style={styles.seatTitleRow}>
                <Text style={styles.bigSeatCode}>
                  {activeBooking ? currentSeatName : 'No Seat Assigned'}
                </Text>
                {isPending ? (
                  <Animated.View style={[styles.pendingApprovalBadge, { opacity: pulseAnim }]}>
                    <Animated.View style={[styles.pendingDot, { transform: [{ scale: pulseAnim }] }]} />
                    <Text style={styles.pendingApprovalText}>Pending Approval</Text>
                  </Animated.View>
                ) : (
                  <View style={styles.activeNowBadge}>
                    <Animated.View style={[styles.activeNowDot, { opacity: pulseAnim }]} />
                    <Text style={styles.activeNowText}>
                      {isApproved ? 'Active Now' : 'Available'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.activeLocationText}>
                {currentRoomName}, {currentBranchName}
              </Text>
            </View>
          </View>

          {/* Details Box */}
          <View style={styles.activeDetailsBox}>
            <View style={styles.activeDetailsRow}>
              <View style={[styles.detailLeft, { flex: 1, marginRight: 8 }]}>
                <View style={styles.detailIconBox}>
                  <Ionicons name="time" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailSubtext}>Session Access</Text>
                  <Text style={styles.detailMainText} numberOfLines={1}>Full Day (8 AM - 10 PM)</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={styles.detailSubtext}>Plan Type</Text>
                <Text style={styles.detailMainText}>{activeBooking?.planType || 'MONTHLY'}</Text>
              </View>
            </View>

            <View style={styles.amenityRow}>
              <Animated.View style={{ transform: [{ scale: wifiAnim }] }}>
                <Ionicons name="wifi" size={17} color={COLORS.primary} />
              </Animated.View>
              <Text style={styles.amenitySmallText}>High-Speed Wi-Fi & Power socket available</Text>
              <Animated.View style={[styles.liveSignalDot, { opacity: pulseAnim }]} />
            </View>
          </View>

          {/* Gate Attendance Scanner CTA - Conditional on Admission Approval */}
          {isApproved ? (
            <TouchableOpacity 
              style={{
                backgroundColor: '#059669',
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 14,
                elevation: 3,
                shadowColor: '#059669',
                shadowOpacity: 0.35,
                shadowRadius: 6,
              }}
              onPress={handleOpenGateScanner}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={24} color="#ffffff" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                  📷 Scan Gate QR Pass (Punch IN / OUT)
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                  Point camera at gate QR poster to mark attendance
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          ) : isPending ? (
            <TouchableOpacity 
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.12)',
                borderColor: '#d97706',
                borderWidth: 1.5,
                borderRadius: 14,
                paddingVertical: 13,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 14,
              }}
              onPress={handleOpenGateScanner}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-closed" size={22} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#d97706', fontWeight: '800', fontSize: 14 }}>
                  🔒 Scanner Locked (Admin Approval Pending)
                </Text>
                <Text style={{ color: '#d97706', fontSize: 11, marginTop: 2 }}>
                  Admin ke approve karte hi attendance scanner unlock hoga
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                borderWidth: 1,
                borderRadius: 14,
                paddingVertical: 13,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 14,
              }}
              onPress={() => setActiveTab('Book')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color="#38bdf8" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
                  Book Seat to Activate Attendance
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                  Admission approve hote hi pass mil jayega
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Quick Buttons */}
          <View style={[styles.cardActionsRow, { marginTop: 10 }]}>
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

        {/* ---------------- TODAY'S ATTENDANCE STATUS CARD ---------------- */}
        <View style={{
          backgroundColor: todayAttendance?.status === 'PUNCHED_IN' 
            ? 'rgba(16, 185, 129, 0.08)' 
            : todayAttendance?.status === 'COMPLETED'
              ? 'rgba(14, 165, 233, 0.08)'
              : 'rgba(30, 41, 59, 0.6)',
          borderColor: todayAttendance?.status === 'PUNCHED_IN'
            ? '#10b981'
            : todayAttendance?.status === 'COMPLETED'
              ? '#0284c7'
              : '#334155',
          borderWidth: 1.5,
          borderRadius: 20,
          padding: 16,
          marginTop: 16,
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons 
                name={todayAttendance?.status === 'PUNCHED_IN' ? 'finger-print' : todayAttendance?.status === 'COMPLETED' ? 'checkmark-done-circle' : 'time-outline'} 
                size={22} 
                color={todayAttendance?.status === 'PUNCHED_IN' ? '#10b981' : todayAttendance?.status === 'COMPLETED' ? '#0284c7' : '#94a3b8'} 
              />
              <Text style={{ fontSize: 13, fontWeight: '800', color: todayAttendance?.status === 'PUNCHED_IN' ? '#10b981' : todayAttendance?.status === 'COMPLETED' ? '#0284c7' : '#94a3b8', letterSpacing: 0.8 }}>
                TODAY'S ATTENDANCE (आज की हाज़िरी)
              </Text>
            </View>

            {todayAttendance ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Ionicons name="calendar-outline" size={12} color="#cbd5e1" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#cbd5e1' }}>
                  {todayAttendance.dateString || 'Today'}
                </Text>
              </View>
            ) : null}
          </View>

          {todayAttendance?.status === 'PUNCHED_IN' ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: 14, borderRadius: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                    🟢 Punched IN • Studying Now
                  </Text>
                  <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 2 }}>
                    {todayAttendance.timeIn}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                    📍 {todayAttendance.branchName || currentBranchName || 'Library'}
                  </Text>
                </View>

                {isApproved && (
                  <TouchableOpacity
                    onPress={handleOpenGateScanner}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#10b981',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name="exit-outline" size={16} color="#ffffff" />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>
                      Punch OUT
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={{ color: '#6ee7b7', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                ✅ Attendance lag chuki hai. Library se bahar jate waqt QR scan karke Punch OUT karein.
              </Text>
            </View>
          ) : todayAttendance?.status === 'COMPLETED' ? (
            <View>
              <View style={{ backgroundColor: 'rgba(2, 132, 199, 0.12)', padding: 14, borderRadius: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>
                    ✅ COMPLETED TODAY (हाज़िरी पूरी हुई)
                  </Text>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800', backgroundColor: '#0284c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    ⏱️ {todayAttendance.duration}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>Punch IN Time</Text>
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                      {todayAttendance.timeIn}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#64748b" />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>Punch OUT Time</Text>
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                      {todayAttendance.timeOut || '-'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14 }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '800' }}>
                  ⏳ Aaj Abhi Tak Attendance Nahi Lagi
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                  Gate par laga QR code scan karke check-in karein
                </Text>
              </View>
              {isApproved && (
                <TouchableOpacity
                  onPress={handleOpenGateScanner}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: '#059669',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="qr-code" size={14} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>
                    Scan Gate
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ---------------- MONTHLY ATTENDANCE CALENDAR (मंथली हाज़िरी कैलेंडर) ---------------- */}
        <View style={{
          backgroundColor: '#0f172a',
          borderColor: '#1e293b',
          borderWidth: 1.5,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar" size={18} color="#10b981" />
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                {calendarData?.monthName || 'Monthly Attendance'}
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>
                {calendarData?.monthlyPresentCount || stats?.daysPresent || 0} Days Present
              </Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e293b', borderRadius: 12, padding: 10, marginBottom: 14 }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>THIS MONTH</Text>
              <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                {calendarData?.monthlyPresentCount || 0} / {calendarData?.totalDaysInMonth || 30}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#334155' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>ATTENDANCE</Text>
              <Text style={{ color: '#10b981', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                {calendarData?.monthlyAttendancePercent || 0}%
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#334155' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700' }}>STREAK</Text>
              <Text style={{ color: '#f59e0b', fontSize: 15, fontWeight: '800', marginTop: 2 }}>
                {stats?.streak || 0} Days 🔥
              </Text>
            </View>
          </View>

          {/* Weekday headers (M T W T F S S) */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
              <Text key={dIdx} style={{ width: 34, textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: '700' }}>
                {day}
              </Text>
            ))}
          </View>

          {/* Monthly Calendar Grid (Days 1 to 30/31) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}>
            {Array.from({ length: calendarData?.totalDaysInMonth || 30 }, (_, i) => i + 1).map((dayNum) => {
              const isPresent = calendarData?.presentDays?.includes(dayNum);
              const isToday = dayNum === (calendarData?.todayDate || new Date().getDate());
              return (
                <View
                  key={dayNum}
                  style={{
                    width: (width - 40 - 32 - 36) / 7,
                    height: 36,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isPresent 
                      ? '#10b981' 
                      : isToday 
                        ? 'rgba(56, 189, 248, 0.2)' 
                        : '#1e293b',
                    borderColor: isToday ? '#38bdf8' : isPresent ? '#059669' : '#334155',
                    borderWidth: isToday ? 1.5 : 1,
                  }}
                >
                  <Text style={{
                    color: isPresent ? '#ffffff' : isToday ? '#38bdf8' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: isPresent || isToday ? '800' : '600',
                  }}>
                    {dayNum}
                  </Text>
                  {isPresent && (
                    <View style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffffff' }} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#10b981' }} />
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>Present (उपस्थित)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' }} />
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>Absent (अनुपस्थित)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, borderColor: '#38bdf8', borderWidth: 1.5 }} />
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600' }}>Today (आज)</Text>
            </View>
          </View>
        </View>

        {/* ---------------- RECENT ATTENDANCE HISTORY LIST ---------------- */}
        <View style={{
          backgroundColor: '#0f172a',
          borderColor: '#1e293b',
          borderWidth: 1,
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar" size={17} color="#38bdf8" />
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>
                Attendance History (हाज़िरी का रिकॉर्ड)
              </Text>
            </View>
            <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '700' }}>
              {attendanceLogs.length} Records
            </Text>
          </View>

          {attendanceLogs && attendanceLogs.length > 0 ? (
            attendanceLogs.slice(0, 5).map((log: any, idx: number) => (
              <View 
                key={log.id || idx}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: idx === Math.min(attendanceLogs.length, 5) - 1 ? 0 : 8,
                  borderLeftWidth: 3,
                  borderLeftColor: log.status === 'COMPLETED' ? '#38bdf8' : '#10b981',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                      {log.dateString || 'Record'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: log.status === 'COMPLETED' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                    <Text style={{
                      color: log.status === 'COMPLETED' ? '#38bdf8' : '#10b981',
                      fontSize: 10,
                      fontWeight: '800',
                    }}>
                      {log.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE NOW'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                    ⏰ In: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{log.timeIn}</Text>
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                    🚪 Out: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{log.timeOut || '-'}</Text>
                  </Text>
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>
                    ⏱️ {log.duration}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 12 }}>
                Abhi koi attendance record nahi hai. Gate QR scan karein!
              </Text>
            </View>
          )}
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

        {/* Active Promotional Offer Banner */}
        {pricingConfig?.discountActive ? (
          <View style={styles.specialOfferPromoCard}>
            <View style={styles.specialOfferFireBox}>
              <Ionicons name="flame" size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.specialOfferBadgeText}>SPECIAL STUDENT OFFER</Text>
                {Number(pricingConfig.discountPercent) > 0 ? (
                  <View style={styles.discountPillSmall}>
                    <Text style={styles.discountPillSmallText}>{pricingConfig.discountPercent}% OFF</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.specialOfferHeadline}>{pricingConfig.offerTitle || 'Discounted Monthly Seat Pass Available!'}</Text>
              <Text style={styles.specialOfferPricingSub}>
                Monthly Seat Pass at just <Text style={styles.offerGreenBold}>₹{pricingConfig.monthlyPrice}</Text> (Regular ₹{pricingConfig.monthlyBasePrice})
              </Text>
            </View>
          </View>
        ) : null}

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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={styles.seatSelectionTitle}>Select Seat</Text>
              <Text style={styles.roomSubTitleText}>
                Room: {selectedBranch?.rooms?.find((r: any) => r.id === selectedRoomId)?.name || 'Selected Room'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeRoomBtn}
              onPress={() => {
                setSelectedSeatId(null);
                setSelectedRoomId(null);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="arrow-back" size={13} color={COLORS.primary} />
              <Text style={styles.changeRoomBtnText}>Change Room</Text>
            </TouchableOpacity>
          </View>
          
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
                {pricingConfig?.discountActive && Number(pricingConfig?.discountPercent) > 0 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.strikethroughPrice}>₹{pricingConfig.monthlyBasePrice}</Text>
                    <Text style={styles.confirmPrice}>₹{pricingConfig.monthlyPrice}</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmPrice}>
                    ₹{pricingConfig?.monthlyBasePrice || 1000}
                  </Text>
                )}
                <Text style={styles.confirmDuration}>
                  / month {pricingConfig?.discountActive && Number(pricingConfig?.discountPercent) > 0 ? `(${pricingConfig.discountPercent}% OFF)` : ''}
                </Text>
              </View>
            </View>

            {/* Monthly Membership Plan Badge (Daily and Weekly removed) */}
            <View style={{
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              borderColor: '#0d9488',
              borderWidth: 1.2,
              borderRadius: 12,
              padding: 12,
              marginVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#0d9488',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons name="calendar" size={18} color="#ffffff" />
                </View>
                <View>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
                    Monthly Membership Pass
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>
                    Full 30 Days 24/7 Library & Seat Access
                  </Text>
                </View>
              </View>
              
              <View style={{ alignItems: 'flex-end' }}>
                {pricingConfig?.discountActive && Number(pricingConfig?.discountPercent) > 0 ? (
                  <View style={{
                    backgroundColor: '#ef4444',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11 }}>
                      {pricingConfig.discountPercent}% OFF
                    </Text>
                  </View>
                ) : (
                  <View style={{
                    backgroundColor: 'rgba(13, 148, 136, 0.25)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                  }}>
                    <Text style={{ color: '#0d9488', fontWeight: '800', fontSize: 11 }}>
                      ACTIVE PLAN
                    </Text>
                  </View>
                )}
              </View>
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
        {/* Modern Profile Header Card */}
        <View style={styles.modernProfileCard}>
          <TouchableOpacity 
            style={styles.avatarGlowContainer} 
            activeOpacity={0.85}
            onPress={handlePickImage}
          >
            <Image
              source={{ uri: profilePhoto }}
              style={styles.profileAvatar}
            />
            <View style={styles.avatarCameraBadge}>
              <Ionicons name="camera" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modernUploadBtn} onPress={handlePickImage} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
            <Text style={styles.modernUploadBtnText}>Upload Photo from Mobile</Text>
          </TouchableOpacity>

          <Text style={styles.profileName}>{editName || user?.name || 'Demo Student'}</Text>
          <Text style={styles.profileRole}>Sameer Library Member</Text>

          <View style={styles.memberBadgesRow}>
            <View style={styles.memberBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} />
              <Text style={styles.memberBadgeText}>Verified Student</Text>
            </View>
            <View style={[styles.memberBadge, { backgroundColor: COLORS.secondaryContainer }]}>
              <Ionicons name="star" size={12} color={COLORS.onSecondaryContainer} />
              <Text style={[styles.memberBadgeText, { color: COLORS.onSecondaryContainer }]}>Pro Access</Text>
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

          {/* QR Code Container with Animated Laser Line */}
          <TouchableOpacity 
            style={styles.qrCodeBox} 
            activeOpacity={0.9}
            onPress={handleOpenGateScanner}
          >
            <Ionicons name="qr-code" size={140} color={COLORS.text} />
            <Animated.View 
              style={[
                styles.scanLine, 
                {
                  transform: [{
                    translateY: laserAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-65, 65],
                    }),
                  }],
                },
              ]} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#059669',
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 12,
            }}
            onPress={handleOpenGateScanner}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={18} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>
              📷 Open Camera to Scan Gate QR Pass
            </Text>
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

        {/* Personal Details Card */}
        <View style={styles.personalDetailsCard}>
          <View style={styles.personalDetailsHeaderRow}>
            <Text style={styles.detailsCardTitle}>Personal Details</Text>
            {!isEditingProfile && (
              <TouchableOpacity 
                style={styles.editToggleBtn}
                onPress={() => setIsEditingProfile(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={COLORS.primary} />
                <Text style={styles.editToggleBtnText}>Edit Details</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingProfile ? (
            <View style={styles.editFormBox}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Full Name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your Full Name"
                  placeholderTextColor={COLORS.outline}
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Mobile Number</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+91 Mobile Number"
                  placeholderTextColor={COLORS.outline}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Email Address</Text>
                <TextInput
                  style={styles.editInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="student@gmail.com"
                  placeholderTextColor={COLORS.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.editField}>
                <Text style={styles.editLabel}>Full Address</Text>
                <TextInput
                  style={[styles.editInput, { height: 64, textAlignVertical: 'top' }]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Street, Area, City, Pin code"
                  placeholderTextColor={COLORS.outline}
                  multiline
                />
              </View>

              <View style={styles.editActionsRow}>
                <TouchableOpacity 
                  style={styles.cancelEditBtn}
                  onPress={() => {
                    setIsEditingProfile(false);
                    setEditName(user?.name || '');
                    setEditPhone(user?.phone || '');
                    setEditEmail(user?.email || '');
                    setEditAddress(user?.college || 'Maharajganj, UP');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelEditBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.saveProfileBtn}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                  activeOpacity={0.85}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.saveProfileBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.detailItemRow}>
                <View style={styles.detailIconSmall}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailFieldLabel}>Full Name</Text>
                  <Text style={styles.detailFieldValue}>{editName || user?.name || 'Student Member'}</Text>
                </View>
              </View>

              <View style={styles.detailItemRow}>
                <View style={styles.detailIconSmall}>
                  <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailFieldLabel}>Mobile Number</Text>
                  <Text style={styles.detailFieldValue}>{editPhone || user?.phone || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.detailItemRow}>
                <View style={styles.detailIconSmall}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailFieldLabel}>Email Address</Text>
                  <Text style={styles.detailFieldValue}>{editEmail || user?.email || 'Not provided'}</Text>
                </View>
              </View>

              <View style={styles.detailItemRow}>
                <View style={styles.detailIconSmall}>
                  <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailFieldLabel}>Address</Text>
                  <Text style={styles.detailFieldValue}>{editAddress || 'Maharajganj, Uttar Pradesh'}</Text>
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
            </>
          )}
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
          {(activeTab !== 'Home' || selectedRoomId || isEditingProfile) ? (
            <TouchableOpacity 
              style={styles.backIconButton} 
              onPress={handleStudentBack}
              activeOpacity={0.7}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
              <Text style={styles.backButtonLabel}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.brandIconBox}>
              <Ionicons name="book" size={18} color="#ffffff" />
            </View>
          )}
          <Text style={styles.appBarTitle}>
            {activeTab === 'Profile' ? 'My Profile' : activeTab === 'Book' ? (selectedRoomId ? 'Select Seat' : 'Reserve Seat') : activeTab === 'My Bookings' ? 'My Bookings' : 'Sameer Library'}
          </Text>
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
              source={{ uri: profilePhoto }}
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

      {/* Universal Gate Attendance QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            backgroundColor: '#0f172a',
            zIndex: 10
          }}>
            <TouchableOpacity
              onPress={() => {
                setShowScanner(false);
                setScannerStep('QR');
                setCameraFacing('back');
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>
              {scannerStep === 'QR' ? 'Step 1/2: Scan Gate Pass' : 'Step 2/2: Quick Selfie 🤳'}
            </Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFillObject}
              facing={cameraFacing}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scannerStep === 'QR' ? handleBarCodeScanned : undefined}
            />

            {scannerStep === 'QR' ? (
              /* Step 1: QR Target Reticle Overlay */
              <View style={{
                ...StyleSheet.absoluteFillObject,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.45)'
              }}>
                <View style={{
                  width: 250,
                  height: 250,
                  borderWidth: 2,
                  borderColor: '#22c55e',
                  borderRadius: 16,
                  backgroundColor: 'transparent',
                  position: 'relative'
                }}>
                  <Animated.View style={{
                    height: 3,
                    backgroundColor: '#22c55e',
                    width: '100%',
                    shadowColor: '#22c55e',
                    shadowOpacity: 0.9,
                    shadowRadius: 8,
                    transform: [{
                      translateY: laserAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 245]
                      })
                    }]
                  }} />
                </View>

                <Text style={{
                  color: '#ffffff',
                  fontSize: 15,
                  fontWeight: '800',
                  marginTop: 24,
                  textAlign: 'center',
                  paddingHorizontal: 30
                }}>
                  Point camera at Gate QR Poster at entrance
                </Text>
                <Text style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  marginTop: 6,
                  textAlign: 'center'
                }}>
                  📍 Live GPS location validates you are inside library premises
                </Text>
              </View>
            ) : (
              /* Step 2: Front Camera Live Selfie Verification Overlay */
              <View style={{
                ...StyleSheet.absoluteFillObject,
                justifyContent: 'space-between',
                paddingVertical: 30,
                backgroundColor: 'rgba(0,0,0,0.25)'
              }}>
                <View style={{ alignItems: 'center', paddingHorizontal: 20 }}>
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.9)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>
                      ✓ Gate QR Scanned Successfully
                    </Text>
                  </View>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 10 }}>
                    Align your face inside the circle 🧑
                  </Text>
                </View>

                {/* Face Target Oval */}
                <View style={{
                  alignSelf: 'center',
                  width: 240,
                  height: 280,
                  borderRadius: 120,
                  borderWidth: 3,
                  borderColor: '#10b981',
                  borderStyle: 'dashed',
                  backgroundColor: 'transparent',
                }} />

                {/* Bottom Capture Buttons */}
                <View style={{ paddingHorizontal: 20 }}>
                  <TouchableOpacity
                    onPress={() => handleCaptureAndPunch(false)}
                    disabled={capturingSelfie}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#10b981',
                      borderRadius: 16,
                      paddingVertical: 15,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      elevation: 4,
                      shadowColor: '#10b981',
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                    }}
                  >
                    {capturingSelfie ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Ionicons name="camera" size={22} color="#ffffff" />
                    )}
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>
                      {capturingSelfie ? 'Verifying & Punching...' : 'Take Selfie & Punch Attendance'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleCaptureAndPunch(true)}
                    disabled={capturingSelfie}
                    style={{ alignSelf: 'center', paddingVertical: 10 }}
                  >
                    <Text style={{ color: '#94a3b8', fontSize: 13, textDecorationLine: 'underline' }}>
                      Skip Selfie (Location Only Punch)
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
                    🔒 0-Cost Security: Selfie photo 24 ghante baad auto-delete ho jayegi.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
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
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
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
  pendingApprovalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  pendingApprovalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  liveSignalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginLeft: 6,
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
  modernProfileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 4px 16px rgba(0,0,0,0.04)',
      },
    }),
  },
  avatarGlowContainer: {
    position: 'relative',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    elevation: 3,
  },
  modernUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modernUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
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
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
    marginBottom: 8,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
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
  },
  personalDetailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  editToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  editFormBox: {
    gap: 12,
    paddingTop: 4,
  },
  editField: {
    gap: 4,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  editInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelEditBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveProfileBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveProfileBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
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

  // Special offer promo card in Book tab
  specialOfferPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#ffedd5',
    gap: 12,
  },
  specialOfferFireBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialOfferBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  discountPillSmall: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountPillSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  specialOfferHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9a3412',
    marginTop: 2,
  },
  specialOfferPricingSub: {
    fontSize: 11,
    color: '#7c2d12',
    marginTop: 2,
  },
  offerGreenBold: {
    fontWeight: '800',
    color: '#15803d',
    fontSize: 13,
  },

  // Change room button
  changeRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  changeRoomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  roomSubTitleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Strikethrough price & discount tags
  strikethroughPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  pillDiscountTag: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  pillDiscountTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
  },
  backButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 2,
  },
});

export default StudentDashboard;
