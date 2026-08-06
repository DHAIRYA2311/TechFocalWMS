<?php

$models = ['User', 'PurchaseOrder', 'JobCard', 'Machine', 'Attendance', 'Customer', 'Invoice', 'DeliveryChallan', 'Setting'];
foreach ($models as $model) {
    $path = 'c:\Dhairya Amin\Projects\TechFocal\backend\app\Models\\' . $model . '.php';
    if (file_exists($path)) {
        $content = file_get_contents($path);
        if (strpos($content, 'use App\Traits\LogsActivity;') === false) {
            $content = str_replace("use Illuminate\Database\Eloquent\Model;", "use Illuminate\Database\Eloquent\Model;\nuse App\Traits\LogsActivity;", $content);
            $content = preg_replace('/use HasFactory([^;]*);/', "use HasFactory$1;\n    use LogsActivity;", $content);
            
            // If the model didn't have HasFactory, just insert it after the class opening brace
            if (strpos($content, 'use LogsActivity;') === false) {
                $content = preg_replace('/class ' . $model . ' extends Model\s*\{/', "class " . $model . " extends Model\n{\n    use LogsActivity;\n", $content);
            }
            
            file_put_contents($path, $content);
            echo "Added LogsActivity to $model\n";
        }
    }
}
