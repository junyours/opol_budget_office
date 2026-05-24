<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL: modify the enum to add 'viewer'
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','department-head','admin-hrmo','super-admin','viewer') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','department-head','admin-hrmo','super-admin') NOT NULL");
    }
};
