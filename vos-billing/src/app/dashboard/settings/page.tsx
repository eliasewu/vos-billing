"use client";

import { useState, useEffect } from "react";
import { Settings, Server, Database, Shield, CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dbVersion, setDbVersion] = useState("");

  const checkConnection = async () => {
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/vos/connection");
      const data = await res.json();
      if (data.connected) {
        setConnectionStatus("connected");
        setDbVersion(data.version || "");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-surface-400" />
          System Settings
        </h1>
        <p className="text-surface-400 text-sm mt-1">
          Net2App VOS Billing — Configuration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-brand-500/10 rounded-lg">
              <Database className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-50">Database Connection</h3>
              <p className="text-xs text-surface-500">MySQL connection status</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg border border-surface-700/50">
              <span className="text-surface-300">Connection Status</span>
              {connectionStatus === "checking" ? (
                <span className="flex items-center gap-2 text-amber-400">
                  <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  Checking...
                </span>
              ) : connectionStatus === "connected" ? (
                <span className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-4 h-4" />
                  Disconnected
                </span>
              )}
            </div>

            {dbVersion && (
              <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg border border-surface-700/50">
                <span className="text-surface-300">MySQL Version</span>
                <span className="text-surface-50 font-mono text-sm">{dbVersion}</span>
              </div>
            )}

            <button
              onClick={checkConnection}
              className="w-full px-4 py-2 bg-brand-600 hover:bg-brand-700 text-surface-50 rounded-lg text-sm font-medium transition-colors"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Environment Variables */}
        <div className="bg-surface-900 border border-surface-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Server className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-50">Configuration</h3>
              <p className="text-xs text-surface-500">Environment variables</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-surface-800/50 rounded-lg border border-surface-700/50">
              <p className="text-xs text-surface-500 mb-1">VOS_DB_HOST</p>
              <p className="text-sm text-surface-50 font-mono">
                {process.env.NEXT_PUBLIC_VOS_DB_HOST || "Not set (using default: 127.0.0.1)"}
              </p>
            </div>
            <div className="p-3 bg-surface-800/50 rounded-lg border border-surface-700/50">
              <p className="text-xs text-surface-500 mb-1">VOS_DB_PORT</p>
              <p className="text-sm text-surface-50 font-mono">
                {process.env.NEXT_PUBLIC_VOS_DB_PORT || "Not set (using default: 3306)"}
              </p>
            </div>
            <div className="p-3 bg-surface-800/50 rounded-lg border border-surface-700/50">
              <p className="text-xs text-surface-500 mb-1">VOS_DB_NAME</p>
              <p className="text-sm text-surface-50 font-mono">
                {process.env.NEXT_PUBLIC_VOS_DB_NAME || "Not set (using default: vos3000db)"}
              </p>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="lg:col-span-2 bg-surface-900 border border-surface-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-50">Setup Instructions</h3>
              <p className="text-xs text-surface-500">
                Configure database connection
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 bg-surface-800/30 rounded-lg border border-surface-700/30">
              <p className="text-surface-300 mb-2">
                Set the following environment variables to connect to your MySQL database:
              </p>
              <pre className="p-3 bg-surface-950 rounded-lg text-xs text-emerald-400 font-mono overflow-x-auto">
{`VOS_DB_HOST=192.168.1.100
VOS_DB_PORT=3306
VOS_DB_USER=root
VOS_DB_PASSWORD=your_password
VOS_DB_NAME=vos_billing_db
JWT_SECRET=your-secure-secret-key`}
              </pre>
            </div>

            <div className="p-4 bg-surface-800/30 rounded-lg border border-surface-700/30">
              <p className="text-surface-300 mb-2">
                <strong>Compatible Database Tables:</strong>
              </p>
              <ul className="list-disc list-inside text-surface-400 space-y-1">
                <li>e_customer / customer — Customer accounts</li>
                <li>e_gateway / gateway — Gateway configuration</li>
                <li>e_route / routing — Routing rules</li>
                <li>e_gateway_group — Gateway groups for LCR</li>
                <li>e_rate_table / e_rate — Rate tables and rates</li>
                <li>e_active_call — Active call sessions</li>
                <li>e_cdr — Call detail records</li>
                <li>e_sysuser — Admin user authentication</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
              <p className="text-amber-400 text-xs">
                <strong>Note:</strong> This web platform reads/writes directly to your MySQL database.
                Make sure to backup your database before making changes. The platform auto-detects
                table names based on common naming conventions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
