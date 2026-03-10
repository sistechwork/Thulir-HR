import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Play, Pause, Settings, Loader } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LiveMonitor() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [multicastUrl, setMulticastUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('streamUrl') || 'udp://239.255.42.42:36666';
    }
    return 'udp://239.255.42.42:36666';
  });
  const [tempMulticastUrl, setTempMulticastUrl] = useState(multicastUrl);

  // Auto-detect and prepend protocol if missing
  const ensureProtocol = (url: string): string => {
    if (!url) return '';

    // If it has protocol, return as-is
    if (url.match(/^(udp|rtsp|http|https):\/\//i)) {
      return url;
    }

    // If it looks like IP:PORT for multicast, prepend udp://
    if (url.includes(':')) {
      return `udp://${url}`;
    }

    // Otherwise assume HTTP
    return `http://${url}`;
  };
  const [streamStatus, setStreamStatus] = useState<string>('Initializing...');
  const [cameraUsername, setCameraUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cameraUsername') || '';
    }
    return '';
  });
  const [cameraPassword, setCameraPassword] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cameraPassword') || '';
    }
    return '';
  });

  // Redirect if not manager
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "manager")) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  // Check stream status on load
  useEffect(() => {
    if (user?.role === 'manager') {
      checkStreamStatus();
    }
  }, [user]);

  // Initialize HLS player
  const initializeHLSPlayer = async () => {
    try {
      if (!videoRef.current) return;

      // Load hls.js dynamically
      const Hls = (await import('hls.js')).default;

      const video = videoRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
        });

        hls.loadSource('/hls/stream.m3u8');
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play();
          setStreamStatus('🟢 Live');
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            setStreamStatus(`⚠️ Streaming Error: ${data.details}`);
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = '/hls/stream.m3u8';
        video.addEventListener('play', () => setStreamStatus('🟢 Live'));
      }
    } catch (error) {
      console.error('Failed to initialize HLS player:', error);
      setStreamStatus('Failed to load player');
    }
  };

  const checkStreamStatus = async () => {
    try {
      const response = await fetch('/api/hls/status', { credentials: 'include' });
      const data = await response.json();
      setIsStreaming(data.running);
      if (data.running && videoRef.current) {
        initializeHLSPlayer();
      }
    } catch (error) {
      console.error('Failed to check stream status:', error);
    }
  };

  const startStreaming = async () => {
    try {
      setIsLoading2(true);

      // Ensure proper protocol format
      let streamUrlWithProtocol = ensureProtocol(multicastUrl);
      let streamUrlWithAuth = streamUrlWithProtocol;

      // Add credentials to HTTP/HTTPS/RTSP URLs if provided
      if (cameraUsername && cameraPassword) {
        if (streamUrlWithAuth.startsWith('http://')) {
          streamUrlWithAuth = streamUrlWithAuth.replace(
            'http://',
            `http://${cameraUsername}:${cameraPassword}@`
          );
        } else if (streamUrlWithAuth.startsWith('https://')) {
          streamUrlWithAuth = streamUrlWithAuth.replace(
            'https://',
            `https://${cameraUsername}:${cameraPassword}@`
          );
        } else if (streamUrlWithAuth.startsWith('rtsp://')) {
          streamUrlWithAuth = streamUrlWithAuth.replace(
            'rtsp://',
            `rtsp://${cameraUsername}:${cameraPassword}@`
          );
        }
      }

      const response = await fetch('/api/hls/start', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multicastUrl: streamUrlWithAuth }),
      });

      if (response.ok) {
        await initializeHLSPlayer();
        setIsStreaming(true);
        setStreamStatus('Starting stream...');
        localStorage.setItem('streamUrl', streamUrlWithProtocol);
        localStorage.setItem('cameraUsername', cameraUsername);
        localStorage.setItem('cameraPassword', cameraPassword);
        setShowSettings(false);
      } else {
        const error = await response.json();
        setStreamStatus(`❌ Error: ${error.message}`);
      }
      setIsLoading2(false);
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setStreamStatus('❌ Connection failed');
      setIsLoading2(false);
    }
  };

  const stopStreaming = async () => {
    try {
      setIsLoading2(true);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      await fetch('/api/hls/stop', {
        method: 'POST',
        credentials: 'include',
      });

      setIsStreaming(false);
      setStreamStatus('Stream stopped');
      setIsLoading2(false);
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      setIsLoading2(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  if (!user || user.role !== "manager") {
    return null;
  }

  return (
    <>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Video className="w-8 h-8 text-green-600" />
                Live Monitor - CCTV Camera (HLS Stream)
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time HLS video streaming from multicast CCTV feed
              </p>
            </div>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-camera-settings"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>

          {/* Settings */}
          {showSettings && (
            <Card className="mb-6 shadow-lg border-2 border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-950 border-b">
                <CardTitle className="text-blue-700 dark:text-blue-300">HLS Stream Configuration</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Stream URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stream URL (Complete Format Required)
                  </label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      type="text"
                      placeholder="e.g., udp://239.255.42.42:36666 or rtsp://camera-ip:554/stream or http://public-ip:8080/stream"
                      value={tempMulticastUrl}
                      onChange={(e) => setTempMulticastUrl(e.target.value)}
                      className="flex-1"
                      data-testid="input-stream-url"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <strong>⚠️ Format must include protocol, IP, and PORT:</strong>
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1 ml-3">
                    <li>✓ <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">udp://239.255.42.42:36666</code></li>
                    <li>✓ <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">rtsp://192.168.0.126:554/stream</code></li>
                    <li>✓ <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">http://192.168.1.100:8080/video</code></li>
                    <li>✗ <code className="bg-red-100 dark:bg-red-900 px-1 rounded">239.255.42.42</code> (missing protocol & port)</li>
                    <li>✗ <code className="bg-red-100 dark:bg-red-900 px-1 rounded">http://192.168.0.126/</code> (missing port)</li>
                  </ul>
                </div>

                {/* Camera Credentials */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Camera Credentials (Optional)
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Username</label>
                      <Input
                        type="text"
                        placeholder="Enter camera username"
                        value={cameraUsername}
                        onChange={(e) => setCameraUsername(e.target.value)}
                        className="mt-1"
                        data-testid="input-camera-username"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Password</label>
                      <Input
                        type="password"
                        placeholder="Enter camera password"
                        value={cameraPassword}
                        onChange={(e) => setCameraPassword(e.target.value)}
                        className="mt-1"
                        data-testid="input-camera-password"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      💡 Credentials are securely stored in your browser and used only for authentication with the camera stream.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setMulticastUrl(tempMulticastUrl);
                      localStorage.setItem('streamUrl', tempMulticastUrl);
                      localStorage.setItem('cameraUsername', cameraUsername);
                      localStorage.setItem('cameraPassword', cameraPassword);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-save-stream-url"
                  >
                    Save Configuration
                  </Button>
                  {tempMulticastUrl.includes('192.168') || tempMulticastUrl.includes('10.0') || tempMulticastUrl.includes('172.16') ? (
                    <Button
                      disabled
                      className="bg-gray-400 cursor-not-allowed text-white"
                      title="Private IPs cannot be accessed from Replit. Use port forwarding or ngrok."
                      data-testid="button-open-camera-login"
                    >
                      Private IP - Use Port Forwarding
                    </Button>
                  ) : (
                    <a
                      href={tempMulticastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        data-testid="button-open-camera-login"
                      >
                        Open Camera Login →
                      </Button>
                    </a>
                  )}
                </div>

                {(tempMulticastUrl.includes('192.168') || tempMulticastUrl.includes('10.0') || tempMulticastUrl.includes('172.16')) && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-4 text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-2">🔗 Private IP Detected</p>
                    <p className="text-xs mb-3">Replit cannot access private network IPs directly. Choose an option:</p>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white dark:bg-black p-2 rounded border border-yellow-200 dark:border-yellow-700">
                        <p className="font-semibold mb-1">Option 1: Port Forwarding</p>
                        <ol className="ml-3 space-y-1 list-decimal">
                          <li>In your router settings, forward external port to 192.168.0.126:37777</li>
                          <li>Get your public IP from your ISP</li>
                          <li>Enter: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">http://YOUR_PUBLIC_IP:FORWARD_PORT</code></li>
                        </ol>
                      </div>
                      <div className="bg-white dark:bg-black p-2 rounded border border-yellow-200 dark:border-yellow-700">
                        <p className="font-semibold mb-1">Option 2: ngrok Tunnel (Easiest)</p>
                        <ol className="ml-3 space-y-1 list-decimal">
                          <li>Download ngrok: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">ngrok.com</code></li>
                          <li>Run: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">ngrok http 192.168.0.126:37777</code></li>
                          <li>Copy the public URL and paste in Settings above</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">💡 Stream Types Supported:</p>
                  <p className="text-xs mb-2">FFmpeg automatically detects your stream type:</p>
                  <ul className="text-xs space-y-1 ml-3">
                    <li>✓ UDP Multicast (239.x.x.x)</li>
                    <li>✓ RTSP/RTMP Streams</li>
                    <li>✓ HTTP/HTTPS Streams</li>
                    <li>✓ MJPEG Camera Feeds</li>
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">⚠️ Troubleshooting:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Check stream URL is accessible and format is correct</li>
                    <li>• Ensure CCTV is powered and sending stream</li>
                    <li>• Check server logs for FFmpeg errors after clicking "Start Stream"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Alert */}
          <Alert className={`mb-6 border-2 ${isStreaming ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'}`}>
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <>
                  <div className="w-3 h-3 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></div>
                  <span className={isStreaming ? 'text-green-800 dark:text-green-300' : 'text-gray-800 dark:text-gray-300'}>
                    {streamStatus}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-800 dark:text-gray-300">⏸️ {streamStatus}</span>
                </>
              )}
            </div>
          </Alert>

          {/* Controls */}
          <Card className="mb-6 shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-cyan-50 dark:from-green-950 dark:to-cyan-950 border-b">
              <CardTitle className="text-green-700 dark:text-green-300">Stream Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex gap-4">
              <Button
                onClick={isStreaming ? stopStreaming : startStreaming}
                disabled={isLoading2}
                className={isStreaming ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
                data-testid="button-toggle-stream"
              >
                {isLoading2 ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {isStreaming ? 'Stopping...' : 'Starting...'}
                  </>
                ) : (
                  <>
                    {isStreaming ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Stop Stream
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Stream
                      </>
                    )}
                  </>
                )}
              </Button>

              <Button
                onClick={checkStreamStatus}
                variant="outline"
                data-testid="button-refresh-status"
              >
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          {/* Video Player - Tabs for HLS and Direct Camera */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-cyan-50 dark:from-green-950 dark:to-cyan-950 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Live Camera Feed
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-black">
              <Tabs defaultValue="hls" className="w-full" data-testid="video-tabs">
                <TabsList className="grid w-full grid-cols-2 bg-gray-800 rounded-none">
                  <TabsTrigger value="hls" className="bg-transparent text-white">HLS Stream</TabsTrigger>
                  <TabsTrigger value="direct" className="bg-transparent text-white">Direct Camera</TabsTrigger>
                </TabsList>

                {/* HLS Stream Tab */}
                <TabsContent value="hls" className="p-0">
                  <div className="w-full bg-black" style={{ aspectRatio: "16/9" }}>
                    {isStreaming ? (
                      <video
                        ref={videoRef}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        data-testid="video-hls-stream"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-600">Stream not running</p>
                          <p className="text-xs text-gray-500 mt-1">Click "Start Stream" to begin</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Direct Camera Tab - Embed Camera Web Interface */}
                <TabsContent value="direct" className="p-0">
                  <div className="w-full bg-black" style={{ aspectRatio: "16/9" }}>
                    {tempMulticastUrl && tempMulticastUrl.includes('192.168') ? (
                      <iframe
                        src={tempMulticastUrl}
                        className="w-full h-full border-0"
                        allow="camera; microphone; fullscreen"
                        data-testid="iframe-direct-camera"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <div className="text-center text-gray-300">
                          <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="font-semibold mb-2">Direct Camera Feed</p>
                          <p className="text-sm text-gray-400 mb-3">Enter your camera URL in Settings (e.g., http://192.168.0.126:37777)</p>
                          <p className="text-xs text-gray-500">Make sure it's your camera's web interface URL</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Card className="shadow-lg border-0">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Stream Status</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{isStreaming ? '🟢 LIVE' : '⏸️ OFFLINE'}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-0">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Stream Source</p>
                <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">{multicastUrl}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg border-0">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Format</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">HLS / FFmpeg</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
