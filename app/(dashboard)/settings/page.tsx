import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Smartphone, Webhook, Copy } from "lucide-react";

export default async function SettingsPage() {
  const session = await requireAuth();

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  const smsMode = process.env.SMS_MODE ?? "simulation";
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://yourdomain.com";
  const webhookUrl = `${baseUrl}/api/sms/inbound`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Organization and system configuration</p>
      </div>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-gray-400" /> Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">{org?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Slug</span>
            <code className="text-xs bg-gray-100 rounded px-2 py-0.5">{org?.slug}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Your role</span>
            <Badge variant={session.user.role === "ADMIN" ? "default" : "secondary"} className="capitalize text-xs">
              {session.user.role === "ADMIN" ? "Admin" : "Team Leader"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SMS mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-gray-400" /> SMS Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Mode</span>
            <Badge variant={smsMode === "live" ? "default" : "secondary"} className="capitalize">
              {smsMode === "live" ? "Live (Twilio)" : "Simulation"}
            </Badge>
          </div>
          {smsMode === "simulation" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              SMS messages are being simulated. Set <code className="bg-amber-100 px-1 rounded">SMS_MODE=live</code> in your environment to send real messages via Twilio.
            </p>
          )}
          {smsMode === "live" && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              SMS messages are sent live via Twilio.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Twilio webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-gray-400" /> Twilio Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-gray-600">
            Configure this URL as the incoming message webhook in your Twilio phone number settings so volunteer replies are automatically processed.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <code className="flex-1 text-xs break-all text-gray-700">{webhookUrl}</code>
          </div>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Log into <strong>console.twilio.com</strong></li>
            <li>Go to Phone Numbers → Manage → Active Numbers</li>
            <li>Click your number and find "Messaging" configuration</li>
            <li>Set "When a message comes in" to the URL above (HTTP POST)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
