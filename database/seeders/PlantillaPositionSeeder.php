<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlantillaPositionSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('plantilla_positions')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $now = now();

        // Inserted in chunks to keep the file manageable
        $records = [
            // dept_id 1 - Mayor's Office
            ['plantilla_position_id' => 1,   'old_item_number' => '1',   'new_item_number' => '1',   'position_title' => 'Municipal Mayor',                                          'salary_grade' => 27, 'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 2,   'old_item_number' => null,  'new_item_number' => '3',   'position_title' => 'Com. Equipment Operator II',                               'salary_grade' => 6,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 3,   'old_item_number' => '10',  'new_item_number' => '4',   'position_title' => 'Admin. Aide IV(Clerk II)',                                 'salary_grade' => 4,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 4,   'old_item_number' => '12',  'new_item_number' => '5',   'position_title' => 'Admin Aide III(Utility Worker II)',                        'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 5,   'old_item_number' => '13',  'new_item_number' => '6',   'position_title' => 'Admin Aide III(Clerk I)',                                  'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 6,   'old_item_number' => '14',  'new_item_number' => '7',   'position_title' => 'Admin. Aide III (Utility Worker II)',                      'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 7,   'old_item_number' => '15',  'new_item_number' => '8',   'position_title' => 'Admin. Aide III (Utility Worker II)',                      'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 8,   'old_item_number' => '16',  'new_item_number' => '9',   'position_title' => 'Chaufer/Personal Driver',                                  'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 9,   'old_item_number' => '202', 'new_item_number' => '11',  'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 10,  'old_item_number' => '203', 'new_item_number' => '12',  'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 11,  'old_item_number' => null,  'new_item_number' => '15',  'position_title' => 'Engineer III (Agriculture & Biosystems Engr.',              'salary_grade' => 19, 'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 12,  'old_item_number' => null,  'new_item_number' => '13',  'position_title' => 'Municipal Information Officer I',                          'salary_grade' => 24, 'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 13,  'old_item_number' => null,  'new_item_number' => '14',  'position_title' => 'Municipal Legal Officer I',                                'salary_grade' => 24, 'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 14,  'old_item_number' => '5',   'new_item_number' => '286', 'position_title' => 'Executive Assistant IV',                                   'salary_grade' => 24, 'dept_id' => 1,  'is_active' => false],
            ['plantilla_position_id' => 15,  'old_item_number' => '4',   'new_item_number' => '2',   'position_title' => 'Comm. Affairs Offcr. II',                                  'salary_grade' => 15, 'dept_id' => 1,  'is_active' => true],
            ['plantilla_position_id' => 16,  'old_item_number' => null,  'new_item_number' => '288', 'position_title' => 'Admin Officer I (Records Officer)',                        'salary_grade' => 10, 'dept_id' => 1,  'is_active' => false],
            ['plantilla_position_id' => 17,  'old_item_number' => '7',   'new_item_number' => '289', 'position_title' => 'Security Agent II',                                       'salary_grade' => 10, 'dept_id' => 1,  'is_active' => false],
            ['plantilla_position_id' => 18,  'old_item_number' => '8',   'new_item_number' => '291', 'position_title' => 'Admin. Aide VI (Clerk III)',                               'salary_grade' => 6,  'dept_id' => 1,  'is_active' => false],
            ['plantilla_position_id' => 19,  'old_item_number' => '9',   'new_item_number' => '292', 'position_title' => 'Admin.Aide IV(Clerk II)',                                  'salary_grade' => 4,  'dept_id' => 1,  'is_active' => false],
            ['plantilla_position_id' => 20,  'old_item_number' => '11',  'new_item_number' => '10',  'position_title' => 'Admin Aide III(Utility Worker II)',                        'salary_grade' => 3,  'dept_id' => 1,  'is_active' => true],

            // dept_id 2 - Municipal Administrator
            ['plantilla_position_id' => 21,  'old_item_number' => null,  'new_item_number' => '16',  'position_title' => 'Municipal Administrator',                                  'salary_grade' => 24, 'dept_id' => 2,  'is_active' => true],
            ['plantilla_position_id' => 22,  'old_item_number' => null,  'new_item_number' => '17',  'position_title' => 'Computer Maintenance  Technologist - 1',                   'salary_grade' => 11, 'dept_id' => 2,  'is_active' => true],
            ['plantilla_position_id' => 23,  'old_item_number' => '299', 'new_item_number' => '290', 'position_title' => 'Records Officer I',                                       'salary_grade' => 10, 'dept_id' => 2,  'is_active' => false],
            ['plantilla_position_id' => 24,  'old_item_number' => null,  'new_item_number' => '18',  'position_title' => 'Administrative Aide II (Bookbinder I)',                    'salary_grade' => 2,  'dept_id' => 2,  'is_active' => true],
            ['plantilla_position_id' => 25,  'old_item_number' => null,  'new_item_number' => '19',  'position_title' => 'Administrative Aide II (Messenger)',                       'salary_grade' => 2,  'dept_id' => 2,  'is_active' => true],

            // dept_id 3 - HRMO
            ['plantilla_position_id' => 26,  'old_item_number' => null,  'new_item_number' => '21',  'position_title' => 'Administrative Officer V (HRMO III)',                      'salary_grade' => 18, 'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 27,  'old_item_number' => '3',   'new_item_number' => '22',  'position_title' => 'Administrative Officer IV (HRMO II)',                      'salary_grade' => 15, 'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 28,  'old_item_number' => '217', 'new_item_number' => '25',  'position_title' => 'Data Entry Machine Operator I',                           'salary_grade' => 6,  'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 29,  'old_item_number' => null,  'new_item_number' => '26',  'position_title' => 'Data Entry Machine Operator I',                           'salary_grade' => 6,  'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 30,  'old_item_number' => null,  'new_item_number' => '20',  'position_title' => 'MGDH I (HRMO)',                                           'salary_grade' => 24, 'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 31,  'old_item_number' => null,  'new_item_number' => '23',  'position_title' => 'Administrative Officer IV (HRMO II)',                      'salary_grade' => 15, 'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 32,  'old_item_number' => '6',   'new_item_number' => '24',  'position_title' => 'Admin. Officer II (HRMO I)',                               'salary_grade' => 11, 'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 33,  'old_item_number' => null,  'new_item_number' => '27',  'position_title' => 'Administrative Aide II(Messenger)',                        'salary_grade' => 2,  'dept_id' => 3,  'is_active' => true],
            ['plantilla_position_id' => 34,  'old_item_number' => null,  'new_item_number' => '28',  'position_title' => 'Administrative Aide I',                                    'salary_grade' => 1,  'dept_id' => 3,  'is_active' => true],

            // dept_id 4 - General Services
            ['plantilla_position_id' => 35,  'old_item_number' => null,  'new_item_number' => '29',  'position_title' => 'Municipal General Service Officer',                        'salary_grade' => 24, 'dept_id' => 4,  'is_active' => true],
            ['plantilla_position_id' => 36,  'old_item_number' => null,  'new_item_number' => '31',  'position_title' => 'Administrative Aide III (Driver I)',                       'salary_grade' => 3,  'dept_id' => 4,  'is_active' => true],
            ['plantilla_position_id' => 37,  'old_item_number' => null,  'new_item_number' => '32',  'position_title' => 'Administrative Aide III (Driver I)',                       'salary_grade' => 3,  'dept_id' => 4,  'is_active' => true],
            ['plantilla_position_id' => 38,  'old_item_number' => null,  'new_item_number' => '30',  'position_title' => 'Water Pump Operator',                                      'salary_grade' => 4,  'dept_id' => 4,  'is_active' => true],
            ['plantilla_position_id' => 39,  'old_item_number' => null,  'new_item_number' => '33',  'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 4,  'is_active' => true],

            // dept_id 6 - LDRRMO
            ['plantilla_position_id' => 40,  'old_item_number' => '194', 'new_item_number' => '35',  'position_title' => 'Local DRRM Officer V',                                    'salary_grade' => 24, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 41,  'old_item_number' => '149', 'new_item_number' => '36',  'position_title' => 'Local DRRM Officer III',                                  'salary_grade' => 18, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 42,  'old_item_number' => '150', 'new_item_number' => '43',  'position_title' => 'Special Operations Officer I',                             'salary_grade' => 10, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 43,  'old_item_number' => '201', 'new_item_number' => '37',  'position_title' => 'Local DRRM Officer II',                                   'salary_grade' => 15, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 44,  'old_item_number' => '232', 'new_item_number' => '45',  'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 45,  'old_item_number' => null,  'new_item_number' => '46',  'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 46,  'old_item_number' => null,  'new_item_number' => '47',  'position_title' => 'Lifeguard',                                               'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 47,  'old_item_number' => '199', 'new_item_number' => '38',  'position_title' => 'Local DRRM Officer II',                                   'salary_grade' => 15, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 48,  'old_item_number' => '200', 'new_item_number' => '39',  'position_title' => 'Local DRRM Officer II',                                   'salary_grade' => 15, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 49,  'old_item_number' => null,  'new_item_number' => '40',  'position_title' => 'Special Operations Officer II',                            'salary_grade' => 14, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 50,  'old_item_number' => null,  'new_item_number' => '41',  'position_title' => 'Special Operations Officer II',                            'salary_grade' => 14, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 51,  'old_item_number' => null,  'new_item_number' => '42',  'position_title' => 'Special Operations Officer II',                            'salary_grade' => 14, 'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 52,  'old_item_number' => null,  'new_item_number' => '44',  'position_title' => 'Communication Equipment Operator',                         'salary_grade' => 4,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 53,  'old_item_number' => null,  'new_item_number' => '48',  'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 54,  'old_item_number' => null,  'new_item_number' => '51',  'position_title' => 'Utility Worker I',                                        'salary_grade' => 1,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 55,  'old_item_number' => null,  'new_item_number' => '49',  'position_title' => 'Lifeguard',                                               'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],
            ['plantilla_position_id' => 56,  'old_item_number' => null,  'new_item_number' => '50',  'position_title' => 'Lifeguard',                                               'salary_grade' => 3,  'dept_id' => 6,  'is_active' => true],

            // dept_id 5
            ['plantilla_position_id' => 57,  'old_item_number' => '145', 'new_item_number' => '34',  'position_title' => 'Sports & Games Inspector I',                              'salary_grade' => 6,  'dept_id' => 5,  'is_active' => true],

            // dept_id 7
            ['plantilla_position_id' => 58,  'old_item_number' => null,  'new_item_number' => '53',  'position_title' => 'Administrative Aide IV',                                   'salary_grade' => 4,  'dept_id' => 7,  'is_active' => true],
            ['plantilla_position_id' => 59,  'old_item_number' => null,  'new_item_number' => '52',  'position_title' => 'Municipal Gov. Dept. Head',                               'salary_grade' => 24, 'dept_id' => 7,  'is_active' => true],

            // dept_id 8 - RTMO
            ['plantilla_position_id' => 60,  'old_item_number' => null,  'new_item_number' => '55',  'position_title' => 'RTMO (Designate)',                                        'salary_grade' => 3,  'dept_id' => 8,  'is_active' => true],
            ['plantilla_position_id' => 61,  'old_item_number' => null,  'new_item_number' => '54',  'position_title' => 'Traffic Aide II',                                         'salary_grade' => 5,  'dept_id' => 8,  'is_active' => true],
            ['plantilla_position_id' => 62,  'old_item_number' => null,  'new_item_number' => '56',  'position_title' => 'Laborer I',                                               'salary_grade' => 1,  'dept_id' => 8,  'is_active' => true],

            // dept_id 13 - Sangguniang Bayan
            ['plantilla_position_id' => 63,  'old_item_number' => '17',  'new_item_number' => '57',  'position_title' => 'Municipal Vice Mayor',                                     'salary_grade' => 25, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 64,  'old_item_number' => '20',  'new_item_number' => '58',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 65,  'old_item_number' => '24',  'new_item_number' => '59',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 66,  'old_item_number' => '25',  'new_item_number' => '60',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 67,  'old_item_number' => '18',  'new_item_number' => '61',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 68,  'old_item_number' => '19',  'new_item_number' => '62',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 69,  'old_item_number' => '21',  'new_item_number' => '63',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 70,  'old_item_number' => '22',  'new_item_number' => '64',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 71,  'old_item_number' => '23',  'new_item_number' => '65',  'position_title' => 'SB Member',                                               'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 72,  'old_item_number' => '26',  'new_item_number' => '66',  'position_title' => 'SB Member, Liga Chapter President',                       'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 73,  'old_item_number' => '27',  'new_item_number' => '67',  'position_title' => 'SB Member, SK Federation President',                      'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],
            ['plantilla_position_id' => 74,  'old_item_number' => '28',  'new_item_number' => '68',  'position_title' => 'SB Member, I.P. Federation President',                    'salary_grade' => 24, 'dept_id' => 13, 'is_active' => true],

            // dept_id 14 - SB Secretariat
            ['plantilla_position_id' => 75,  'old_item_number' => '29',  'new_item_number' => '69',  'position_title' => 'SB Secretary',                                            'salary_grade' => 24, 'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 76,  'old_item_number' => null,  'new_item_number' => '71',  'position_title' => 'Local Legislative Staff Officer III',                      'salary_grade' => 16, 'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 77,  'old_item_number' => '32',  'new_item_number' => '74',  'position_title' => 'Admin. Aide VI (Data Entry Controller)',                   'salary_grade' => 6,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 78,  'old_item_number' => '34',  'new_item_number' => '76',  'position_title' => 'Admin Aide IV (Bookbinder II)',                            'salary_grade' => 4,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 79,  'old_item_number' => '36',  'new_item_number' => '78',  'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 80,  'old_item_number' => '212', 'new_item_number' => '70',  'position_title' => 'Local Legislative Staff Officer IV',                       'salary_grade' => 19, 'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 81,  'old_item_number' => '213', 'new_item_number' => '72',  'position_title' => 'Local Legislative Staff Officer III',                      'salary_grade' => 16, 'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 82,  'old_item_number' => '30',  'new_item_number' => '73',  'position_title' => 'Legal Staff Officer II',                                  'salary_grade' => 13, 'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 83,  'old_item_number' => '31',  'new_item_number' => '75',  'position_title' => 'Admin. Aide VI (Clerk III)',                               'salary_grade' => 6,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 84,  'old_item_number' => '33',  'new_item_number' => '77',  'position_title' => 'Admin. Aide IV',                                           'salary_grade' => 4,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 85,  'old_item_number' => '35',  'new_item_number' => '79',  'position_title' => 'Admin Aide III',                                           'salary_grade' => 3,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 86,  'old_item_number' => '233', 'new_item_number' => '80',  'position_title' => 'Administrative Aide II (Bookbinder)',                      'salary_grade' => 2,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 87,  'old_item_number' => '234', 'new_item_number' => '81',  'position_title' => 'Administrative Aide II (Messenger)',                       'salary_grade' => 2,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 88,  'old_item_number' => '235', 'new_item_number' => '82',  'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 14, 'is_active' => true],
            ['plantilla_position_id' => 89,  'old_item_number' => null,  'new_item_number' => '83',  'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 14, 'is_active' => true],

            // dept_id 15 - MPDC
            ['plantilla_position_id' => 90,  'old_item_number' => '37',  'new_item_number' => '84',  'position_title' => 'Municipal Planning & Development Coordinator',              'salary_grade' => 24, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 91,  'old_item_number' => null,  'new_item_number' => '88',  'position_title' => 'Project Evaluation Officer I',                             'salary_grade' => 11, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 92,  'old_item_number' => '42',  'new_item_number' => '95',  'position_title' => 'Admin. Aide III (Clerk I)',                                'salary_grade' => 3,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 93,  'old_item_number' => '43',  'new_item_number' => '96',  'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 94,  'old_item_number' => null,  'new_item_number' => '85',  'position_title' => 'Information Officer I',                                    'salary_grade' => 19, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 95,  'old_item_number' => '38',  'new_item_number' => '86',  'position_title' => 'Planning Officer III',                                    'salary_grade' => 18, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 96,  'old_item_number' => '39',  'new_item_number' => '87',  'position_title' => "Project Dev't. Officer II",                               'salary_grade' => 15, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 97,  'old_item_number' => null,  'new_item_number' => '89',  'position_title' => 'Statistician',                                            'salary_grade' => 11, 'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 98,  'old_item_number' => '40',  'new_item_number' => '90',  'position_title' => 'Asst. Statistician',                                      'salary_grade' => 9,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 99,  'old_item_number' => null,  'new_item_number' => '91',  'position_title' => 'Zoning Inspector I',                                      'salary_grade' => 6,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 100, 'old_item_number' => '41',  'new_item_number' => '92',  'position_title' => 'Draftsman I',                                             'salary_grade' => 6,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 101, 'old_item_number' => null,  'new_item_number' => '93',  'position_title' => 'Admin Aide IV (Bookbinder)',                               'salary_grade' => 4,  'dept_id' => 15, 'is_active' => true],
            ['plantilla_position_id' => 102, 'old_item_number' => '204', 'new_item_number' => '94',  'position_title' => 'Admin Aide IV (Bookbinder II)',                            'salary_grade' => 4,  'dept_id' => 15, 'is_active' => true],

            // dept_id 16 - Civil Registrar
            ['plantilla_position_id' => 103, 'old_item_number' => '44',  'new_item_number' => '97',  'position_title' => 'Municipal Civil Registrar',                               'salary_grade' => 24, 'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 104, 'old_item_number' => '48',  'new_item_number' => '103', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 105, 'old_item_number' => null,  'new_item_number' => '98',  'position_title' => 'Asst. Registrar III',                                     'salary_grade' => 18, 'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 106, 'old_item_number' => '45',  'new_item_number' => '99',  'position_title' => 'Registration Officer II',                                 'salary_grade' => 14, 'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 107, 'old_item_number' => '46',  'new_item_number' => '100', 'position_title' => 'Registration Officer I',                                  'salary_grade' => 10, 'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 108, 'old_item_number' => '47',  'new_item_number' => '101', 'position_title' => 'Asst. Registration Officer',                              'salary_grade' => 8,  'dept_id' => 16, 'is_active' => true],
            ['plantilla_position_id' => 109, 'old_item_number' => null,  'new_item_number' => '102', 'position_title' => 'Bookbinder III',                                          'salary_grade' => 7,  'dept_id' => 16, 'is_active' => true],

            // dept_id 17 - Budget Office
            ['plantilla_position_id' => 110, 'old_item_number' => '49',  'new_item_number' => '104', 'position_title' => 'Municipal Budget Officer',                                'salary_grade' => 24, 'dept_id' => 17, 'is_active' => true],
            ['plantilla_position_id' => 111, 'old_item_number' => '51',  'new_item_number' => '105', 'position_title' => 'Admin. Asst. II (Budgeting Assistant)',                    'salary_grade' => 8,  'dept_id' => 17, 'is_active' => true],
            ['plantilla_position_id' => 112, 'old_item_number' => '52',  'new_item_number' => '107', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 17, 'is_active' => true],
            ['plantilla_position_id' => 113, 'old_item_number' => '218', 'new_item_number' => '108', 'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 17, 'is_active' => true],
            ['plantilla_position_id' => 114, 'old_item_number' => '50',  'new_item_number' => '287', 'position_title' => 'Administrative Officer IV (Budget Officer II)',             'salary_grade' => 15, 'dept_id' => 17, 'is_active' => false],
            ['plantilla_position_id' => 115, 'old_item_number' => '205', 'new_item_number' => '106', 'position_title' => 'Admin. Aide IV (Budgeting Aide)',                          'salary_grade' => 4,  'dept_id' => 17, 'is_active' => true],

            // dept_id 18 - Accounting
            ['plantilla_position_id' => 116, 'old_item_number' => '53',  'new_item_number' => '109', 'position_title' => 'Mun. Accountant',                                         'salary_grade' => 24, 'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 117, 'old_item_number' => '54',  'new_item_number' => '110', 'position_title' => "Admin. Officer IV (Mng't & Audit Analyst II)",             'salary_grade' => 15, 'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 118, 'old_item_number' => '55',  'new_item_number' => '111', 'position_title' => 'Admin. Asst. III (Sr. Bookkeeper)',                        'salary_grade' => 9,  'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 119, 'old_item_number' => '56',  'new_item_number' => '112', 'position_title' => 'Admin. Asst. II',                                          'salary_grade' => 8,  'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 120, 'old_item_number' => '57',  'new_item_number' => '113', 'position_title' => 'Acctg. Clerk II',                                         'salary_grade' => 6,  'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 121, 'old_item_number' => '58',  'new_item_number' => '114', 'position_title' => 'Admin. Aide III (Utility Worker II)',                      'salary_grade' => 3,  'dept_id' => 18, 'is_active' => true],
            ['plantilla_position_id' => 122, 'old_item_number' => null,  'new_item_number' => '115', 'position_title' => 'Admin. Aide III (Utility Worker II)',                      'salary_grade' => 3,  'dept_id' => 18, 'is_active' => true],

            // dept_id 19 - Treasury
            ['plantilla_position_id' => 123, 'old_item_number' => '59',  'new_item_number' => '116', 'position_title' => 'Municipal Treasurer',                                     'salary_grade' => 24, 'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 124, 'old_item_number' => '60',  'new_item_number' => '117', 'position_title' => 'Assistant Mun. Treasurer',                                'salary_grade' => 22, 'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 125, 'old_item_number' => '61',  'new_item_number' => '118', 'position_title' => 'Local Rev. Coll. Officer II',                             'salary_grade' => 15, 'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 126, 'old_item_number' => '195', 'new_item_number' => '119', 'position_title' => 'Revenue Collection Clerk III',                            'salary_grade' => 9,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 127, 'old_item_number' => '196', 'new_item_number' => '120', 'position_title' => 'Revenue Collection Clerk III',                            'salary_grade' => 9,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 128, 'old_item_number' => '197', 'new_item_number' => '121', 'position_title' => 'Revenue Collection Clerk III',                            'salary_grade' => 9,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 129, 'old_item_number' => '198', 'new_item_number' => '122', 'position_title' => 'Revenue Collection Clerk III',                            'salary_grade' => 9,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 130, 'old_item_number' => '63',  'new_item_number' => '124', 'position_title' => 'Revenue Collection Clerk II',                             'salary_grade' => 7,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 131, 'old_item_number' => '64',  'new_item_number' => '125', 'position_title' => 'Revenue Collection Clerk II',                             'salary_grade' => 7,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 132, 'old_item_number' => '65',  'new_item_number' => '126', 'position_title' => 'Revenue Collection Clerk II',                             'salary_grade' => 7,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 133, 'old_item_number' => '67',  'new_item_number' => '127', 'position_title' => 'Revenue Collection Clerk II',                             'salary_grade' => 7,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 134, 'old_item_number' => '71',  'new_item_number' => '132', 'position_title' => 'Admin Aide III (Clerk II)',                                'salary_grade' => 3,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 135, 'old_item_number' => '72',  'new_item_number' => '133', 'position_title' => 'Admin Aide I',                                            'salary_grade' => 1,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 136, 'old_item_number' => '62',  'new_item_number' => '123', 'position_title' => 'Disbursing Officer II',                                   'salary_grade' => 8,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 137, 'old_item_number' => '66',  'new_item_number' => '128', 'position_title' => 'Revenue Collection Clerk II',                             'salary_grade' => 7,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 138, 'old_item_number' => '68',  'new_item_number' => '129', 'position_title' => 'Admin Aide VI (Clerk III)',                                'salary_grade' => 6,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 139, 'old_item_number' => '69',  'new_item_number' => '130', 'position_title' => 'Rev. Coll. Clerk I',                                      'salary_grade' => 5,  'dept_id' => 19, 'is_active' => true],
            ['plantilla_position_id' => 140, 'old_item_number' => '70',  'new_item_number' => '131', 'position_title' => 'Rev. Coll. Clerk I',                                      'salary_grade' => 5,  'dept_id' => 19, 'is_active' => true],

            // dept_id 20 - Assessor
            ['plantilla_position_id' => 141, 'old_item_number' => '73',  'new_item_number' => '134', 'position_title' => 'Municipal Assessor',                                      'salary_grade' => 24, 'dept_id' => 20, 'is_active' => true],
            ['plantilla_position_id' => 148, 'old_item_number' => '78',  'new_item_number' => '145', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 20, 'is_active' => true],
            ['plantilla_position_id' => 149, 'old_item_number' => null,  'new_item_number' => '137', 'position_title' => 'Admin. Officer I (Records Officer I)',                     'salary_grade' => 10, 'dept_id' => 20, 'is_active' => true],
            ['plantilla_position_id' => 150, 'old_item_number' => '74',  'new_item_number' => '135', 'position_title' => 'Local Ass. Operation Ofcr II',                            'salary_grade' => 15, 'dept_id' => 20, 'is_active' => true],
            ['plantilla_position_id' => 151, 'old_item_number' => '75',  'new_item_number' => '139', 'position_title' => 'Housing & Homesite Reg. Asst.',                            'salary_grade' => 8,  'dept_id' => 20, 'is_active' => true],
            ['plantilla_position_id' => 152, 'old_item_number' => null,  'new_item_number' => '144', 'position_title' => 'Admin Aide lV',                                           'salary_grade' => 4,  'dept_id' => 20, 'is_active' => true],

            // dept_id 21 - Health
            ['plantilla_position_id' => 153, 'old_item_number' => '79',  'new_item_number' => '146', 'position_title' => 'Municipal Health Officer',                                'salary_grade' => 24, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 154, 'old_item_number' => '84',  'new_item_number' => '150', 'position_title' => 'Nurse I',                                                 'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 155, 'old_item_number' => '214', 'new_item_number' => '151', 'position_title' => 'Medical Technologist',                                    'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 156, 'old_item_number' => null,  'new_item_number' => '152', 'position_title' => 'Nutritionist Dietician II(MNAO)',                          'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 157, 'old_item_number' => null,  'new_item_number' => '153', 'position_title' => 'Nurse I',                                                 'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 158, 'old_item_number' => '81',  'new_item_number' => '156', 'position_title' => 'Midwife III',                                             'salary_grade' => 13, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 159, 'old_item_number' => '82',  'new_item_number' => '157', 'position_title' => 'Midwife III',                                             'salary_grade' => 13, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 160, 'old_item_number' => '85',  'new_item_number' => '158', 'position_title' => 'Midwife II',                                              'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 161, 'old_item_number' => '86',  'new_item_number' => '159', 'position_title' => 'Midwife II',                                              'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 162, 'old_item_number' => '83',  'new_item_number' => '160', 'position_title' => 'Med. Tech I',                                             'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 163, 'old_item_number' => '87',  'new_item_number' => '161', 'position_title' => 'Midwife II',                                              'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 164, 'old_item_number' => null,  'new_item_number' => '162', 'position_title' => 'Pharmacist I',                                            'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 165, 'old_item_number' => '93',  'new_item_number' => '165', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 166, 'old_item_number' => '95',  'new_item_number' => '166', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 167, 'old_item_number' => '98',  'new_item_number' => '167', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 168, 'old_item_number' => '99',  'new_item_number' => '168', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 169, 'old_item_number' => '94',  'new_item_number' => '169', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 170, 'old_item_number' => null,  'new_item_number' => '170', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 171, 'old_item_number' => '96',  'new_item_number' => '171', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 172, 'old_item_number' => '92',  'new_item_number' => '172', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 173, 'old_item_number' => '100', 'new_item_number' => '179', 'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 174, 'old_item_number' => '220', 'new_item_number' => '180', 'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 175, 'old_item_number' => '102', 'new_item_number' => '181', 'position_title' => 'Admin Aide III (Clerk I)',                                 'salary_grade' => 3,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 176, 'old_item_number' => '103', 'new_item_number' => '183', 'position_title' => 'Admin Aide II (Watchman)',                                 'salary_grade' => 2,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 177, 'old_item_number' => '104', 'new_item_number' => '184', 'position_title' => 'Admin Aide I (Utility Worker I)',                          'salary_grade' => 1,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 178, 'old_item_number' => '105', 'new_item_number' => '185', 'position_title' => 'Admin Aide I (Utility Worker I)',                          'salary_grade' => 1,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 179, 'old_item_number' => null,  'new_item_number' => '147', 'position_title' => "Mun. Gov. Ass. Dep't Head",                               'salary_grade' => 22, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 180, 'old_item_number' => '216', 'new_item_number' => '148', 'position_title' => 'Dentist III',                                             'salary_grade' => 16, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 181, 'old_item_number' => '80',  'new_item_number' => '149', 'position_title' => 'Nurse II',                                                'salary_grade' => 16, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 182, 'old_item_number' => null,  'new_item_number' => '154', 'position_title' => 'Nurse I',                                                 'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 183, 'old_item_number' => null,  'new_item_number' => '155', 'position_title' => 'Nurse I',                                                 'salary_grade' => 15, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 184, 'old_item_number' => '88',  'new_item_number' => '163', 'position_title' => 'Midwife II',                                              'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 185, 'old_item_number' => null,  'new_item_number' => '164', 'position_title' => 'Computer Maintenance Technician I',                       'salary_grade' => 11, 'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 186, 'old_item_number' => '89',  'new_item_number' => '173', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 187, 'old_item_number' => '90',  'new_item_number' => '174', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 188, 'old_item_number' => null,  'new_item_number' => '175', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 189, 'old_item_number' => null,  'new_item_number' => '176', 'position_title' => 'Midwife I',                                               'salary_grade' => 9,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 190, 'old_item_number' => '91',  'new_item_number' => '177', 'position_title' => 'Sanitation Inspector',                                    'salary_grade' => 6,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 191, 'old_item_number' => null,  'new_item_number' => '178', 'position_title' => 'Dental Aide',                                             'salary_grade' => 4,  'dept_id' => 21, 'is_active' => true],
            ['plantilla_position_id' => 192, 'old_item_number' => '101', 'new_item_number' => '182', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 21, 'is_active' => true],

            // dept_id 22 - MSWDO
            ['plantilla_position_id' => 193, 'old_item_number' => '106', 'new_item_number' => '186', 'position_title' => 'MSWDO',                                                   'salary_grade' => 24, 'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 194, 'old_item_number' => '107', 'new_item_number' => '187', 'position_title' => 'Social Welfare Officer III',                              'salary_grade' => 18, 'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 195, 'old_item_number' => '108', 'new_item_number' => '188', 'position_title' => 'Social Welfare Officer I (MYDO DESIGNATE)',                'salary_grade' => 11, 'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 196, 'old_item_number' => '110', 'new_item_number' => '190', 'position_title' => 'Social Welfare Assistant',                                'salary_grade' => 8,  'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 197, 'old_item_number' => '113', 'new_item_number' => '191', 'position_title' => 'Social Welfare Aide',                                     'salary_grade' => 4,  'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 198, 'old_item_number' => '114', 'new_item_number' => '194', 'position_title' => 'Admin Aide III(Utility Worker II)',                        'salary_grade' => 3,  'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 199, 'old_item_number' => '109', 'new_item_number' => '189', 'position_title' => 'Social Welfare Officer I',                                'salary_grade' => 11, 'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 200, 'old_item_number' => '111', 'new_item_number' => '192', 'position_title' => 'Social Welfare Aide',                                     'salary_grade' => 4,  'dept_id' => 22, 'is_active' => true],
            ['plantilla_position_id' => 201, 'old_item_number' => '112', 'new_item_number' => '193', 'position_title' => 'Social Welfare Aide',                                     'salary_grade' => 4,  'dept_id' => 22, 'is_active' => true],

            // dept_id 25 - Agriculture
            ['plantilla_position_id' => 202, 'old_item_number' => '115', 'new_item_number' => '197', 'position_title' => 'Municipal Agriculturist',                                 'salary_grade' => 24, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 203, 'old_item_number' => '119', 'new_item_number' => '200', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 204, 'old_item_number' => '117', 'new_item_number' => '201', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 205, 'old_item_number' => '118', 'new_item_number' => '202', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 206, 'old_item_number' => '120', 'new_item_number' => '203', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 207, 'old_item_number' => '188', 'new_item_number' => '208', 'position_title' => 'Meat Inspector',                                          'salary_grade' => 6,  'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 208, 'old_item_number' => '185', 'new_item_number' => '209', 'position_title' => 'Animal Keeper',                                           'salary_grade' => 4,  'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 209, 'old_item_number' => '125', 'new_item_number' => '210', 'position_title' => 'Admin Aide III (Clerk I)',                                 'salary_grade' => 3,  'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 210, 'old_item_number' => '126', 'new_item_number' => '211', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 211, 'old_item_number' => '127', 'new_item_number' => '212', 'position_title' => 'Watchman',                                                'salary_grade' => 2,  'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 212, 'old_item_number' => '186', 'new_item_number' => '198', 'position_title' => "Cooperative Dev't. Specialist",                           'salary_grade' => 15, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 213, 'old_item_number' => '116', 'new_item_number' => '199', 'position_title' => 'Agriculturist II',                                        'salary_grade' => 15, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 214, 'old_item_number' => '121', 'new_item_number' => '204', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 215, 'old_item_number' => '122', 'new_item_number' => '205', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 216, 'old_item_number' => '123', 'new_item_number' => '206', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],
            ['plantilla_position_id' => 217, 'old_item_number' => '124', 'new_item_number' => '207', 'position_title' => 'Agricultural Technologist',                               'salary_grade' => 10, 'dept_id' => 25, 'is_active' => true],

            // dept_id 26 - Engineering
            ['plantilla_position_id' => 218, 'old_item_number' => '128', 'new_item_number' => '213', 'position_title' => 'Municipal Engineer',                                      'salary_grade' => 24, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 219, 'old_item_number' => null,  'new_item_number' => '214', 'position_title' => 'Engineer III',                                            'salary_grade' => 19, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 220, 'old_item_number' => null,  'new_item_number' => '215', 'position_title' => 'Engineer II',                                             'salary_grade' => 16, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 221, 'old_item_number' => '130', 'new_item_number' => '217', 'position_title' => 'Proj. Evaluation Officer',                                'salary_grade' => 15, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 222, 'old_item_number' => '131', 'new_item_number' => '218', 'position_title' => 'Engineer I',                                              'salary_grade' => 12, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 223, 'old_item_number' => '134', 'new_item_number' => '221', 'position_title' => 'Engineering Asst.',                                        'salary_grade' => 8,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 224, 'old_item_number' => '137', 'new_item_number' => '224', 'position_title' => 'Laborer II',                                              'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 225, 'old_item_number' => '138', 'new_item_number' => '225', 'position_title' => 'Laborer II',                                              'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 226, 'old_item_number' => '139', 'new_item_number' => '226', 'position_title' => 'Laborer II',                                              'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 227, 'old_item_number' => '140', 'new_item_number' => '227', 'position_title' => 'Administrative Aide III (Utility Worker II)',              'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 228, 'old_item_number' => '143', 'new_item_number' => '231', 'position_title' => 'Laborer I',                                               'salary_grade' => 1,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 229, 'old_item_number' => null,  'new_item_number' => '222', 'position_title' => 'Draftsman II',                                            'salary_grade' => 8,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 230, 'old_item_number' => '129', 'new_item_number' => '216', 'position_title' => 'Engineer II',                                             'salary_grade' => 16, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 231, 'old_item_number' => null,  'new_item_number' => '219', 'position_title' => 'Building Inspector',                                      'salary_grade' => 11, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 232, 'old_item_number' => '133', 'new_item_number' => '220', 'position_title' => 'Administrative Asst. IV (Carpenter Gen. Foreman)',         'salary_grade' => 10, 'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 233, 'old_item_number' => '135', 'new_item_number' => '223', 'position_title' => 'Engineering Aide',                                        'salary_grade' => 4,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 234, 'old_item_number' => '141', 'new_item_number' => '228', 'position_title' => 'Mason I',                                                 'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 235, 'old_item_number' => '142', 'new_item_number' => '229', 'position_title' => 'Plumber I',                                               'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 236, 'old_item_number' => '136', 'new_item_number' => '230', 'position_title' => 'Laborer II',                                              'salary_grade' => 3,  'dept_id' => 26, 'is_active' => true],
            ['plantilla_position_id' => 237, 'old_item_number' => '144', 'new_item_number' => '232', 'position_title' => 'Laborer I',                                               'salary_grade' => 1,  'dept_id' => 26, 'is_active' => true],

            // dept_id 27 - OBO
            ['plantilla_position_id' => 238, 'old_item_number' => null,  'new_item_number' => '233', 'position_title' => 'Municipal Government Department Head',                    'salary_grade' => 24, 'dept_id' => 27, 'is_active' => true],
            ['plantilla_position_id' => 239, 'old_item_number' => '267', 'new_item_number' => '234', 'position_title' => 'Engineer II (OBO Designate)',                              'salary_grade' => 16, 'dept_id' => 27, 'is_active' => true],
            ['plantilla_position_id' => 240, 'old_item_number' => '268', 'new_item_number' => '236', 'position_title' => 'Admin Aide II(Messenger)',                                 'salary_grade' => 2,  'dept_id' => 27, 'is_active' => true],
            ['plantilla_position_id' => 241, 'old_item_number' => null,  'new_item_number' => '235', 'position_title' => 'Engineer I',                                              'salary_grade' => 12, 'dept_id' => 27, 'is_active' => true],
            ['plantilla_position_id' => 242, 'old_item_number' => null,  'new_item_number' => '237', 'position_title' => 'Admin Aide I(Utility)',                                    'salary_grade' => 1,  'dept_id' => 27, 'is_active' => true],

            // dept_id 28 - Tourism
            ['plantilla_position_id' => 243, 'old_item_number' => '146', 'new_item_number' => '240', 'position_title' => 'Tourism Operation Officer I',                              'salary_grade' => 11, 'dept_id' => 28, 'is_active' => true],
            ['plantilla_position_id' => 244, 'old_item_number' => null,  'new_item_number' => '238', 'position_title' => 'Senior Tourism Operations Officer',                        'salary_grade' => 18, 'dept_id' => 28, 'is_active' => true],
            ['plantilla_position_id' => 245, 'old_item_number' => null,  'new_item_number' => '239', 'position_title' => 'Tourism Operations Officer II',                            'salary_grade' => 15, 'dept_id' => 28, 'is_active' => true],
            ['plantilla_position_id' => 246, 'old_item_number' => null,  'new_item_number' => '241', 'position_title' => 'Admin Aide VI',                                            'salary_grade' => 6,  'dept_id' => 28, 'is_active' => true],
            ['plantilla_position_id' => 247, 'old_item_number' => null,  'new_item_number' => '242', 'position_title' => 'Admin Aide I',                                             'salary_grade' => 1,  'dept_id' => 28, 'is_active' => true],

            // dept_id 29 - MENRO
            ['plantilla_position_id' => 248, 'old_item_number' => '147', 'new_item_number' => '243', 'position_title' => 'MENRO',                                                   'salary_grade' => 24, 'dept_id' => 29, 'is_active' => true],
            ['plantilla_position_id' => 249, 'old_item_number' => '191', 'new_item_number' => '245', 'position_title' => 'Community Affairs Assistant I',                           'salary_grade' => 5,  'dept_id' => 29, 'is_active' => true],
            ['plantilla_position_id' => 250, 'old_item_number' => '192', 'new_item_number' => '246', 'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 29, 'is_active' => true],
            ['plantilla_position_id' => 251, 'old_item_number' => '193', 'new_item_number' => '247', 'position_title' => 'Admin Aide I (Utility Worker I)',                          'salary_grade' => 1,  'dept_id' => 29, 'is_active' => true],
            ['plantilla_position_id' => 252, 'old_item_number' => null,  'new_item_number' => '248', 'position_title' => 'Administrative Staff(Utility Worker I)',                   'salary_grade' => 1,  'dept_id' => 29, 'is_active' => true],
            ['plantilla_position_id' => 253, 'old_item_number' => null,  'new_item_number' => '244', 'position_title' => 'Environmental Management Spec.',                          'salary_grade' => 11, 'dept_id' => 29, 'is_active' => true],

            // dept_id 30
            ['plantilla_position_id' => 254, 'old_item_number' => null,  'new_item_number' => '249', 'position_title' => 'Economist III',                                           'salary_grade' => 18, 'dept_id' => 30, 'is_active' => true],
            ['plantilla_position_id' => 255, 'old_item_number' => null,  'new_item_number' => '250', 'position_title' => 'Economic Researcher',                                     'salary_grade' => 9,  'dept_id' => 30, 'is_active' => true],

            // dept_id 24
            ['plantilla_position_id' => 256, 'old_item_number' => null,  'new_item_number' => '196', 'position_title' => 'MDAO',                                                    'salary_grade' => 24, 'dept_id' => 24, 'is_active' => true],

            // dept_id 31
            ['plantilla_position_id' => 257, 'old_item_number' => null,  'new_item_number' => '251', 'position_title' => "Mun. Gov. Dep't Head I(Mun. Cooperative Dev't Officer I)", 'salary_grade' => 24, 'dept_id' => 31, 'is_active' => true],

            // dept_id 23
            ['plantilla_position_id' => 258, 'old_item_number' => '291', 'new_item_number' => '195', 'position_title' => 'Youth Development Officer III',                           'salary_grade' => 18, 'dept_id' => 23, 'is_active' => true],

            // dept_id 33 - MEEO
            ['plantilla_position_id' => 259, 'old_item_number' => '215', 'new_item_number' => '269', 'position_title' => 'Economist III (MEEO Designate)',                           'salary_grade' => 18, 'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 260, 'old_item_number' => '152', 'new_item_number' => '270', 'position_title' => 'Market Specialist II',                                    'salary_grade' => 15, 'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 261, 'old_item_number' => '151', 'new_item_number' => '271', 'position_title' => 'Market Specialist II (LEIPO Designate)',                   'salary_grade' => 15, 'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 262, 'old_item_number' => '153', 'new_item_number' => '272', 'position_title' => 'Market Supervisor I',                                     'salary_grade' => 10, 'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 263, 'old_item_number' => '157', 'new_item_number' => '273', 'position_title' => 'Revenue Collection Clerk I',                              'salary_grade' => 5,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 264, 'old_item_number' => '158', 'new_item_number' => '277', 'position_title' => 'Meter Reader',                                            'salary_grade' => 4,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 265, 'old_item_number' => '162', 'new_item_number' => '278', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 266, 'old_item_number' => '159', 'new_item_number' => '279', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 267, 'old_item_number' => '160', 'new_item_number' => '280', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 268, 'old_item_number' => '161', 'new_item_number' => '281', 'position_title' => 'Admin Aide III (Utility Worker II)',                       'salary_grade' => 3,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 269, 'old_item_number' => '164', 'new_item_number' => '282', 'position_title' => 'Watchman I',                                              'salary_grade' => 2,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 270, 'old_item_number' => '163', 'new_item_number' => '283', 'position_title' => 'Admin Aide II (Watchman)',                                 'salary_grade' => 2,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 271, 'old_item_number' => '165', 'new_item_number' => '284', 'position_title' => 'Admin Aide I (Utility Worker I)',                          'salary_grade' => 1,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 272, 'old_item_number' => '154', 'new_item_number' => '274', 'position_title' => 'Revenue Collection Clerk I',                              'salary_grade' => 5,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 273, 'old_item_number' => '155', 'new_item_number' => '275', 'position_title' => 'Revenue Collection Clerk I',                              'salary_grade' => 5,  'dept_id' => 33, 'is_active' => true],
            ['plantilla_position_id' => 274, 'old_item_number' => '156', 'new_item_number' => '276', 'position_title' => 'Revenue Collection Clerk I',                              'salary_grade' => 5,  'dept_id' => 33, 'is_active' => true],

            // dept_id 34 - Slaughterhouse
            ['plantilla_position_id' => 275, 'old_item_number' => '187', 'new_item_number' => '285', 'position_title' => 'Slaughterhouse Master I',                                 'salary_grade' => 10, 'dept_id' => 34, 'is_active' => true],

            // dept_id 32 - OCC
            ['plantilla_position_id' => 276, 'old_item_number' => '207', 'new_item_number' => '252', 'position_title' => 'Professor I',                                             'salary_grade' => 24, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 277, 'old_item_number' => '276', 'new_item_number' => '253', 'position_title' => 'Professor I',                                             'salary_grade' => 24, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 278, 'old_item_number' => '184', 'new_item_number' => '257', 'position_title' => 'Nurse I',                                                 'salary_grade' => 15, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 279, 'old_item_number' => '179', 'new_item_number' => '258', 'position_title' => 'Instructor I (OCC-PRESIDENT)',                             'salary_grade' => 12, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 280, 'old_item_number' => '181', 'new_item_number' => '259', 'position_title' => 'Instructor I',                                            'salary_grade' => 12, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 281, 'old_item_number' => '180', 'new_item_number' => '260', 'position_title' => 'Instructor I',                                            'salary_grade' => 12, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 282, 'old_item_number' => '182', 'new_item_number' => '261', 'position_title' => 'Registrar I',                                             'salary_grade' => 11, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 283, 'old_item_number' => '183', 'new_item_number' => '262', 'position_title' => 'Librarian I',                                             'salary_grade' => 11, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 284, 'old_item_number' => '228', 'new_item_number' => '263', 'position_title' => 'Guidance Counselor I',                                    'salary_grade' => 11, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 285, 'old_item_number' => '230', 'new_item_number' => '264', 'position_title' => 'Records Officer I',                                       'salary_grade' => 10, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 286, 'old_item_number' => '231', 'new_item_number' => '265', 'position_title' => 'Driver I',                                                'salary_grade' => 3,  'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 287, 'old_item_number' => null,  'new_item_number' => '266', 'position_title' => 'Administrative Aide II',                                   'salary_grade' => 2,  'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 288, 'old_item_number' => '210', 'new_item_number' => '267', 'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 289, 'old_item_number' => '211', 'new_item_number' => '268', 'position_title' => 'Administrative Aide I (Utility Worker I)',                 'salary_grade' => 1,  'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 290, 'old_item_number' => null,  'new_item_number' => '254', 'position_title' => 'Professor I',                                             'salary_grade' => 24, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 291, 'old_item_number' => '208', 'new_item_number' => '255', 'position_title' => 'Assistant Professor IV',                                  'salary_grade' => 18, 'dept_id' => 32, 'is_active' => true],
            ['plantilla_position_id' => 292, 'old_item_number' => '282', 'new_item_number' => '256', 'position_title' => 'Assistant Professor II',                                  'salary_grade' => 16, 'dept_id' => 32, 'is_active' => true],
        ];

        // Add timestamps to all records
        foreach ($records as &$record) {
            $record['created_at'] = $now;
            $record['updated_at'] = $now;
        }

        // Insert in chunks to avoid memory issues
        foreach (array_chunk($records, 50) as $chunk) {
            DB::table('plantilla_positions')->insert($chunk);
        }

        DB::statement('ALTER TABLE plantilla_positions AUTO_INCREMENT = 293;');
    }
}