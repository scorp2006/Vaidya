import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from './use-toast'
import * as SA from '../lib/super-admin'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: SA.getPlatformStats,
    refetchInterval: 60_000,
  })
}

export function useRecentHospitals(limit = 5) {
  return useQuery({
    queryKey: ['recent-hospitals', limit],
    queryFn: () => SA.getRecentHospitals(limit),
    refetchInterval: 60_000,
  })
}

export function useMonthlyStats() {
  return useQuery({
    queryKey: ['monthly-stats'],
    queryFn: SA.getMonthlyStats,
    staleTime: 5 * 60_000, // 5 minutes
  })
}

// ─── Hospitals ────────────────────────────────────────────────────────────────

export function useAllHospitals() {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: SA.getAllHospitals,
  })
}

export function useHospitalById(id: string) {
  return useQuery({
    queryKey: ['hospital', id],
    queryFn: () => SA.getHospitalById(id),
    enabled: Boolean(id),
  })
}

export function useHospitalStats(hospitalId: string) {
  return useQuery({
    queryKey: ['hospital-stats', hospitalId],
    queryFn: () => SA.getHospitalStats(hospitalId),
    enabled: Boolean(hospitalId),
  })
}

export function useCreateHospital() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: SA.CreateHospitalData) => SA.createHospital(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      toast({
        title: 'Hospital created',
        description: 'The new hospital has been successfully added to the platform.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create hospital',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateHospitalStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'trial' | 'active' | 'suspended' }) =>
      SA.updateHospitalStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospital', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] })
      toast({
        title: 'Status updated',
        description: `Hospital status has been changed to "${variables.status}".`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateHospitalTier() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: 'basic' | 'growth' | 'enterprise' }) =>
      SA.updateHospitalTier(id, plan),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospital', variables.id] })
      toast({
        title: 'Subscription plan updated',
        description: `Hospital plan has been changed to "${variables.plan}".`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update plan',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useTogglePromotion() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, isPromoted }: { id: string; isPromoted: boolean }) =>
      SA.toggleHospitalPromotion(id, isPromoted),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospital', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['promoted-hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospitals-for-promotion'] })
      toast({
        title: variables.isPromoted ? 'Hospital promoted' : 'Promotion removed',
        description: variables.isPromoted
          ? 'The hospital is now featured as promoted.'
          : 'Promotion has been removed from the hospital.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update promotion',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export function useCreateHospitalAdmin() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: SA.CreateHospitalAdminData) => SA.createHospitalAdmin(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospital', variables.hospitalId] })
      toast({
        title: 'Admin created',
        description: `Hospital admin account has been created for ${variables.email}.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create admin',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ['platform-analytics'],
    queryFn: SA.getPlatformAnalytics,
    staleTime: 5 * 60_000, // 5 minutes
  })
}

export function useHospitalRevenue() {
  return useQuery({
    queryKey: ['hospital-revenue'],
    queryFn: SA.getHospitalRevenue,
    staleTime: 5 * 60_000, // 5 minutes
  })
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export function usePromotedHospitals() {
  return useQuery({
    queryKey: ['promoted-hospitals'],
    queryFn: SA.getPromotedHospitals,
  })
}

export function useAllHospitalsForPromotion() {
  return useQuery({
    queryKey: ['hospitals-for-promotion'],
    queryFn: SA.getAllHospitalsForPromotion,
  })
}

export function useUpdatePromotionTier() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      level,
    }: {
      id: string
      level: 'none' | 'promoted' | 'premium'
    }) => SA.updatePromotionTier(id, level),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospital', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['promoted-hospitals'] })
      queryClient.invalidateQueries({ queryKey: ['hospitals-for-promotion'] })
      const label =
        variables.level === 'none'
          ? 'Promotion removed'
          : `Promotion set to "${variables.level}"`
      toast({
        title: 'Promotion tier updated',
        description: label,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update promotion tier',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
