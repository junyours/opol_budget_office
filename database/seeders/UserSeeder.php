<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'username' => 'superadmin',
                'password' => Hash::make('password123'),
                'fname' => 'Sonny Loyd',
                'mname' => 'L',
                'lname' => 'Lazaga',
                'role' => 'super-admin',
                'dept_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'admin',
                'password' => Hash::make('password123'),
                'fname' => 'Greg',
                'mname' => 'M',
                'lname' => 'Radaza',
                'role' => 'admin',
                'dept_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'mayor',
                'password' => Hash::make('password123'),
                'fname' => 'jayfrancis',
                'mname' => null,
                'lname' => 'Bago',
                'role' => 'department-head',
                'dept_id' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'gso',
                'password' => Hash::make('password123'),
                'fname' => 'Norman',
                'mname' => null,
                'lname' => 'Mangusin',
                'role' => 'department-head',
                'dept_id' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'admin-hrmo',
                'password' => Hash::make('password123'),
                'fname' => 'Human',
                'mname' => null,
                'lname' => 'Resources',
                'role' => 'admin-hrmo',
                'dept_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'occ',
                'password' => Hash::make('password123'),
                'fname' => 'Opol Community',
                'mname' => null,
                'lname' => 'College',
                'role' => 'department-head',
                'dept_id' => 32,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'opolmarket',
                'password' => Hash::make('password123'),
                'fname' => 'Opol',
                'mname' => null,
                'lname' => 'Market',
                'role' => 'department-head',
                'dept_id' => 33,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'slaughterhouse',
                'password' => Hash::make('password123'),
                'fname' => 'Slaughter',
                'mname' => null,
                'lname' => 'House',
                'role' => 'department-head',
                'dept_id' => 34,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'mbo',
                'password' => Hash::make('password123'),
                'fname' => 'Greg',
                'mname' => null,
                'lname' => 'Radaza',
                'role' => 'department-head',
                'dept_id' => 17,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
