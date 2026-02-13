import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useToast } from './use-toast'
import * as HMS from '../lib/hms'

// ─── Query Keys ───────────────────────────────────────────────────────────────

const QK = {
  dashboard: (hospitalId: string) => ['hms-dashboard', hospitalId] as const,
  appointments: (hospitalId: string, filters?: HMS.AppointmentFilters) =>
    ['hms-appointments', hospitalId, filters] as const,
  doctors: (hospitalId: string) => ['hms-doctors', hospitalId] as const,
  doctorById: (id: string) => ['hms-doctor', id] as const,
  patients: (hospitalId: string, search?: string) =>
    ['hms-patients', hospitalId, search] as const,
  patientProfile: (userId: string, hospitalId: string) =>
    ['hms-patient-profile', userId, hospitalId] as const,
  queue: (hospitalId: string, doctorId?: string) =>
    ['hms-queue', hospitalId, doctorId] as const,
  analytics: (hospitalId: string) => ['hms-analytics', hospitalId] as const,
  doctorPerformance: (hospitalId: string) => ['hms-doctor-performance', hospitalId] as const,
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function useHmsDashboard() {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.dashboard(hospitalId ?? ''),
    queryFn: () => HMS.getHmsDashboard(hospitalId!),
    enabled: !!hospitalId,
    refetchInterval: 30_000,
  })
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function useAppointments(filters?: Parameters<typeof HMS.getAppointments>[1]) {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.appointments(hospitalId ?? '', filters),
    queryFn: () => HMS.getAppointments(hospitalId!, filters),
    enabled: !!hospitalId,
  })
}

export function useUpdateAppointmentStatus() {
  const { hospitalId } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: string
      status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
    }) => HMS.updateAppointmentStatus(appointmentId, status),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hms-appointments', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-queue', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-dashboard', hospitalId] })

      const label =
        variables.status === 'confirmed'
          ? 'confirmed'
          : variables.status === 'cancelled'
            ? 'cancelled'
            : variables.status === 'completed'
              ? 'completed'
              : 'marked as no-show'

      toast({
        title: 'Appointment updated',
        description: `Appointment has been ${label}.`,
      })
    },

    onError: (error: Error) => {
      toast({
        title: 'Failed to update appointment',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export function useDoctors() {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.doctors(hospitalId ?? ''),
    queryFn: () => HMS.getDoctors(hospitalId!),
    enabled: !!hospitalId,
  })
}

export function useDoctorById(id: string) {
  return useQuery({
    queryKey: QK.doctorById(id),
    queryFn: () => HMS.getDoctorById(id),
    enabled: !!id,
  })
}

export function useCreateDoctor() {
  const { hospitalId } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: HMS.CreateDoctorData) => HMS.createDoctor(hospitalId!, data),

    onSuccess: doctor => {
      queryClient.invalidateQueries({ queryKey: ['hms-doctors', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-dashboard', hospitalId] })

      toast({
        title: 'Doctor added',
        description: `Dr. ${doctor.name} has been added successfully.`,
      })
    },

    onError: (error: Error) => {
      toast({
        title: 'Failed to add doctor',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateDoctor() {
  const { hospitalId } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      doctorId,
      data,
    }: {
      doctorId: string
      data: HMS.UpdateDoctorData
    }) => HMS.updateDoctor(doctorId, data),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hms-doctors', hospitalId] })
      queryClient.invalidateQueries({ queryKey: QK.doctorById(variables.doctorId) })

      toast({
        title: 'Doctor updated',
        description: 'Doctor profile has been updated successfully.',
      })
    },

    onError: (error: Error) => {
      toast({
        title: 'Failed to update doctor',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export function usePatients(search?: string) {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.patients(hospitalId ?? '', search),
    queryFn: () => HMS.getPatients(hospitalId!, search),
    enabled: !!hospitalId,
  })
}

export function usePatientProfile(userId: string) {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.patientProfile(userId, hospitalId ?? ''),
    queryFn: () => HMS.getPatientProfile(userId, hospitalId!),
    enabled: !!userId && !!hospitalId,
  })
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export function useTodayQueue(doctorId?: string) {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.queue(hospitalId ?? '', doctorId),
    queryFn: () => HMS.getTodayQueue(hospitalId!, doctorId),
    enabled: !!hospitalId,
    refetchInterval: 15_000,
  })
}

export function useMarkArrived() {
  const { hospitalId } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (appointmentId: string) => HMS.markPatientArrived(appointmentId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hms-queue', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-appointments', hospitalId] })

      toast({
        title: 'Patient checked in',
        description: 'Patient has been marked as arrived and is now in consultation.',
      })
    },

    onError: (error: Error) => {
      toast({
        title: 'Failed to check in patient',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useCompleteAppointment() {
  const { hospitalId } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (appointmentId: string) => HMS.completeAppointment(appointmentId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hms-queue', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-appointments', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hms-dashboard', hospitalId] })

      toast({
        title: 'Appointment completed',
        description: 'The appointment has been marked as completed.',
      })
    },

    onError: (error: Error) => {
      toast({
        title: 'Failed to complete appointment',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function useHmsAnalytics() {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.analytics(hospitalId ?? ''),
    queryFn: () => HMS.getHmsAnalytics(hospitalId!),
    enabled: !!hospitalId,
  })
}

export function useDoctorPerformance() {
  const { hospitalId } = useAuth()

  return useQuery({
    queryKey: QK.doctorPerformance(hospitalId ?? ''),
    queryFn: () => HMS.getDoctorPerformance(hospitalId!),
    enabled: !!hospitalId,
  })
}
