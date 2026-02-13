
// Mock data and functions for Super Admin

export interface Hospital {
    id: string
    name: string
    subdomain: string
    city: string
    status: 'active' | 'trial' | 'suspended'
    plan: 'basic' | 'growth' | 'enterprise'
    doctorsCount: number
    joinedAt: string
}

export interface AdminStats {
    totalHospitals: number
    totalRevenue: number
    activePatients: number
    hospitalsGrowth: number // percentage
}

const MOCK_HOSPITALS: Hospital[] = [
    {
        id: '1',
        name: 'Apollo Hospital',
        subdomain: 'apollo',
        city: 'Hyderabad',
        status: 'active',
        plan: 'enterprise',
        doctorsCount: 45,
        joinedAt: '2024-01-15'
    },
    {
        id: '2',
        name: 'KIMS Hospital',
        subdomain: 'kims',
        city: 'Secunderabad',
        status: 'active',
        plan: 'growth',
        doctorsCount: 28,
        joinedAt: '2024-02-01'
    },
    {
        id: '3',
        name: 'Sunshine Clinics',
        subdomain: 'sunshine',
        city: 'Bangalore',
        status: 'trial',
        plan: 'basic',
        doctorsCount: 8,
        joinedAt: '2024-02-10'
    }
]

export async function getAdminStats(): Promise<AdminStats> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
        totalHospitals: 124,
        totalRevenue: 4500000,
        activePatients: 8500,
        hospitalsGrowth: 12.5
    }
}

export async function getHospitals(): Promise<Hospital[]> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return MOCK_HOSPITALS
}

export async function createHospital(data: Partial<Hospital>): Promise<Hospital> {
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
        ...data,
        id: Math.random().toString(),
        status: 'trial',
        doctorsCount: 0,
        joinedAt: new Date().toISOString()
    } as Hospital
}
