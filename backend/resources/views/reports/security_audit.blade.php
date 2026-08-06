<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Security Audit Report</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h2 { margin: 0; }
        .header p { color: #666; margin: 5px 0 0 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Security Audit Report</h2>
        <p>Generated on {{ now()->toDateTimeString() }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Action</th>
                <th>Module</th>
                <th>Remarks</th>
            </tr>
        </thead>
        <tbody>
            @foreach($logs as $log)
            <tr>
                <td>{{ $log->created_at->format('Y-m-d H:i:s') }}</td>
                <td>{{ $log->user ? $log->user->name : 'System' }}</td>
                <td>{{ $log->role ?? 'N/A' }}</td>
                <td>{{ $log->ip_address }}</td>
                <td>{{ \Illuminate\Support\Str::limit($log->user_agent, 30) }}</td>
                <td>{{ $log->action }}</td>
                <td>{{ $log->module }}</td>
                <td>{{ $log->remarks }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
