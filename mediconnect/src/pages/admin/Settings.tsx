import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

export function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage platform configurations.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Platform Preferences</CardTitle>
                    <CardDescription>Customize the Super Admin experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Email Notifications</Label>
                            <p className="text-sm text-muted-foreground">
                                Receive daily summaries of platform activity.
                            </p>
                        </div>
                        <Switch id="email-notifications" />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">
                                temporarily disable access for all hospitals.
                            </p>
                        </div>
                        <Switch id="maintenance-mode" />
                    </div>

                    <div className="pt-4">
                        <Button variant="outline">Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
