import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Settings, Globe, Mail, CreditCard, Shield, Bell, Database, Plug, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const apiIntegrations = [
  {
    id: 'flight_gds',
    name: 'Flight GDS (BDFare / Amadeus)',
    description: 'Global Distribution System for real-time flight search, pricing & booking',
    fields: [
      { key: 'api_url', label: 'API Base URL', placeholder: 'https://api.bdfare.com/v1', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your API key', type: 'password' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Your API secret', type: 'password' },
    ],
    docs: 'https://docs.bdfare.com',
    category: 'travel',
  },
  {
    id: 'hotel_supplier',
    name: 'Hotel Supplier API',
    description: 'Hotel inventory, rates & availability from aggregators',
    fields: [
      { key: 'api_url', label: 'API Base URL', placeholder: 'https://api.hotelbeds.com/hotel-api/1.0', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your API key', type: 'password' },
      { key: 'api_secret', label: 'Shared Secret', placeholder: 'Your shared secret', type: 'password' },
    ],
    docs: 'https://developer.hotelbeds.com',
    category: 'travel',
  },
  {
    id: 'esim_provider',
    name: 'eSIM Provider (eSIM Go / Airalo)',
    description: 'International eSIM plan provisioning & QR code delivery',
    fields: [
      { key: 'api_url', label: 'API Base URL', placeholder: 'https://api.esimgo.com/v2', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your API key', type: 'password' },
    ],
    docs: 'https://docs.esimgo.com',
    category: 'digital',
  },
  {
    id: 'recharge_gateway',
    name: 'Mobile Recharge Gateway',
    description: 'BD telecom operator recharge processing (GP, Robi, Banglalink, Airtel, Teletalk)',
    fields: [
      { key: 'api_url', label: 'Gateway URL', placeholder: 'https://api.sslcommerz.com/recharge', type: 'text' },
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Your merchant ID', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your API key', type: 'password' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Your secret key', type: 'password' },
    ],
    docs: '',
    category: 'digital',
  },
  {
    id: 'bill_payment',
    name: 'Bill Payment Gateway',
    description: 'Utility bill payment processing (Electricity, Gas, Water, Internet)',
    fields: [
      { key: 'api_url', label: 'Gateway URL', placeholder: 'https://api.sslcommerz.com/billpay', type: 'text' },
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Your merchant ID', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your API key', type: 'password' },
    ],
    docs: '',
    category: 'digital',
  },
  {
    id: 'payment_bkash',
    name: 'bKash Payment Gateway',
    description: 'bKash merchant payment integration for checkout',
    fields: [
      { key: 'app_key', label: 'App Key', placeholder: 'bKash App Key', type: 'password' },
      { key: 'app_secret', label: 'App Secret', placeholder: 'bKash App Secret', type: 'password' },
      { key: 'username', label: 'Username', placeholder: 'Merchant username', type: 'text' },
      { key: 'password', label: 'Password', placeholder: 'Merchant password', type: 'password' },
      { key: 'sandbox', label: 'Sandbox Mode', placeholder: '', type: 'toggle' },
    ],
    docs: 'https://developer.bka.sh',
    category: 'payment',
  },
  {
    id: 'payment_nagad',
    name: 'Nagad Payment Gateway',
    description: 'Nagad merchant payment integration',
    fields: [
      { key: 'merchant_id', label: 'Merchant ID', placeholder: 'Your Nagad merchant ID', type: 'text' },
      { key: 'api_key', label: 'Public Key', placeholder: 'Nagad public key', type: 'password' },
      { key: 'api_secret', label: 'Private Key', placeholder: 'Nagad private key', type: 'password' },
      { key: 'sandbox', label: 'Sandbox Mode', placeholder: '', type: 'toggle' },
    ],
    docs: 'https://nagad.com.bd/merchant',
    category: 'payment',
  },
  {
    id: 'payment_ssl',
    name: 'SSLCommerz (Card Payments)',
    description: 'Visa/Mastercard/AMEX processing via SSLCommerz',
    fields: [
      { key: 'store_id', label: 'Store ID', placeholder: 'Your store ID', type: 'text' },
      { key: 'store_password', label: 'Store Password', placeholder: 'Your store password', type: 'password' },
      { key: 'sandbox', label: 'Sandbox Mode', placeholder: '', type: 'toggle' },
    ],
    docs: 'https://developer.sslcommerz.com',
    category: 'payment',
  },
  {
    id: 'sms_gateway',
    name: 'SMS Gateway',
    description: 'OTP and transactional SMS delivery',
    fields: [
      { key: 'api_url', label: 'API URL', placeholder: 'https://api.sms.net.bd/sendsms', type: 'text' },
      { key: 'api_key', label: 'API Key', placeholder: 'Your SMS API key', type: 'password' },
      { key: 'sender_id', label: 'Sender ID', placeholder: 'SEVENTRIP', type: 'text' },
    ],
    docs: '',
    category: 'communication',
  },
];

const AdminSettings = () => {
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [enabledApis, setEnabledApis] = useState<Record<string, boolean>>({
    flight_gds: true,
    hotel_supplier: false,
    esim_provider: true,
    recharge_gateway: true,
    bill_payment: true,
    payment_bkash: true,
    payment_nagad: true,
    payment_ssl: true,
    sms_gateway: true,
  });

  const toggleFieldVisibility = (fieldKey: string) => {
    setVisibleFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const toggleApiEnabled = (apiId: string) => {
    setEnabledApis(prev => ({ ...prev, [apiId]: !prev[apiId] }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">System Settings</h1>

      {/* General */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">General Settings</CardTitle>
              <CardDescription>Configure basic platform settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Site Name</Label>
              <Input defaultValue="Seven Trip" />
            </div>
            <div className="space-y-1.5">
              <Label>Support Email</Label>
              <Input defaultValue="support@seventrip.com" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Default Currency</Label>
              <Select defaultValue="bdt">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bdt">BDT (৳)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default Language</Label>
              <Select defaultValue="en">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      {/* Payment Gateway */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Payment Gateways</CardTitle>
              <CardDescription>Configure payment methods</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { name: "bKash", enabled: true },
            { name: "Nagad", enabled: true },
            { name: "Rocket", enabled: false },
            { name: "Visa/Mastercard", enabled: true },
            { name: "Bank Transfer", enabled: true },
          ].map((gw, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{gw.name}</p>
              </div>
              <Switch defaultChecked={gw.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Email Configuration</CardTitle>
              <CardDescription>SMTP settings for system emails</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>SMTP Host</Label>
              <Input placeholder="smtp.example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input placeholder="587" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="noreply@seventrip.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
          </div>
          <Button>Test & Save</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Notification Settings</CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "New Booking Alert", desc: "Get notified for every new booking" },
            { label: "Payment Received", desc: "Alert when payment is received" },
            { label: "Refund Request", desc: "Notify on refund requests" },
            { label: "Low Inventory", desc: "Alert when availability is low" },
          ].map((n, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>


      {/* API Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">API Integrations</CardTitle>
              <CardDescription>Configure 3rd-party API keys for flights, payments, recharge & more. Keys are stored encrypted on the server.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="travel" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="travel">Travel APIs</TabsTrigger>
              <TabsTrigger value="digital">Digital Services</TabsTrigger>
              <TabsTrigger value="payment">Payment Gateways</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>

            {['travel', 'digital', 'payment', 'communication'].map(cat => (
              <TabsContent key={cat} value={cat} className="space-y-4">
                {apiIntegrations.filter(a => a.category === cat).map(api => (
                  <div key={api.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{api.name}</p>
                            <Badge variant={enabledApis[api.id] ? "default" : "secondary"} className="text-[10px] h-5">
                              {enabledApis[api.id] ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{api.description}</p>
                        </div>
                      </div>
                      <Switch checked={enabledApis[api.id]} onCheckedChange={() => toggleApiEnabled(api.id)} />
                    </div>

                    {enabledApis[api.id] && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {api.fields.map(field => (
                            field.type === 'toggle' ? (
                              <div key={field.key} className="flex items-center justify-between col-span-full sm:col-span-1 p-2 rounded border bg-muted/30">
                                <Label className="text-xs">{field.label}</Label>
                                <Switch defaultChecked />
                              </div>
                            ) : (
                              <div key={field.key} className="space-y-1">
                                <Label className="text-xs">{field.label}</Label>
                                <div className="relative">
                                  <Input
                                    type={field.type === 'password' && !visibleFields[`${api.id}_${field.key}`] ? 'password' : 'text'}
                                    placeholder={field.placeholder}
                                    className="pr-10 text-sm h-9"
                                  />
                                  {field.type === 'password' && (
                                    <button
                                      type="button"
                                      onClick={() => toggleFieldVisibility(`${api.id}_${field.key}`)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {visibleFields[`${api.id}_${field.key}`] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" className="h-8 text-xs">Save & Test Connection</Button>
                          {api.docs && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                              <a href={api.docs} target="_blank" rel="noopener noreferrer">View Docs ↗</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-sm font-medium">Clear Cache</p>
              <p className="text-xs text-muted-foreground">Clear all system cache and regenerate</p>
            </div>
            <Button variant="destructive" size="sm">Clear Cache</Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-sm font-medium">Reset System</p>
              <p className="text-xs text-muted-foreground">Reset all settings to defaults</p>
            </div>
            <Button variant="destructive" size="sm">Reset</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
