<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('departments')->insert([
            // GENERAL SERVICES
            [//1
                'dept_name' => 'Office of the Municipal Mayor',
                'dept_abbreviation' => '(M.O.)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
                    Exercise general supervision and control all programs, projects, services and activities; Enforce all laws and ordinances
                    relative to the local governance. In the effective delivery of the basic services, the top 6 priority programs of this administration
                    are, viz: 1) Water Source Identification and Development and Water Distribution; 2) Health and Sanitation Programs;
                    3) Education and Educational Programs; 4) Environment and Ecological Protection and Management; 5) Livelihood
                    Agenda; and 6) Social Services.
                    A vibrant and sustainable commercial, industrial and tourism economy propelled by pro active and self reliant citizenry
                    living in a water sufficient, adaptive and balanced environment and pro poor governance.
                    To make Opol economically productive, empowered and resilient community.
                    TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [//2
                'dept_name' => 'Office of the Municipal Administration',
                'dept_abbreviation' => '(ADMIN)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
                    The development of the full potential is seasoned by the continuing challenges and trends such as construction of projects
                    of the Municipal Government of Opol, Misamis Oriental: a.) Rampant substance abuse; b.) Economic exploitation including
                    prostitution and child labor; c.) Break-up of families; d.) Significant incidence of street children and homelessness;
                    e.) Increasing exposure of people to environment toxins.
                    TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [//3
                'dept_name' => 'Office of the Human Resources and Management Officer',
                'dept_abbreviation' => '(HRMO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
To review and check the completeness of the requirements and supporting documents of appointments; To submit
report of employee separation, accession and DIBAR to the Civil Service Commission; To publish vacant positions to be
filled up; To verify validity of eligibility and licenses to CSC and PRC; To establish databank of every official and employee
based on 185 files and leave records; To provide necessary documents pertaining to pertaining to personnel records and
job order contracts and other related documents; To provide and issue travel order of employees based on training needs;
To coordinate with Civil Service Commission relative to personnel actions and rulings; To submit report on appointments
issued to the commission.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [//
                'dept_name' => 'Office of the General Services Officer',
                'dept_abbreviation' => '(GSO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
To take charge in purchasing and canvassing of materials needed of the Municipal Government Unit; Conduct actual inventory
of office equipment, supplies and materials & other related services; Prepare vouchers and process the supporting documents
regarding requested materials/goods for payment.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Sports',
                'dept_abbreviation' => '(SPORTS)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The development of the full potential is seasoned by the continuing challenges and trends such as construction of projects
of the Municipal Government of Opol, Misamis Oriental: a.) Rampant substance abuse; b.) Economic exploitation including
prostitution and child labor; c.) Break-up of families; d.) Significant incidence of street children and homelessness;
e.) Increasing exposure of people to environment toxins.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Disaster Risk Reduction and Management Officer',
                'dept_abbreviation' => '(MDRRMO)',
                'dept_category_id' => 1,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Public Employment Service Office',
                'dept_abbreviation' => '(PESO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The Public Employment Services Office aims to ensure prompt and efficient delivery of local, national and international
facilitation services as well as to provide timely information on labor market and Department of Labor and Employment
programs. Its core services are to provide labor market information, referral & placement services, employment coaching,
and labor counseling.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Roads and Traffic Management Office',
                'dept_abbreviation' => '(RTMO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The Roads and Traffic Management Office is mandated to ensure order and management of all motorists plying within the
area of jurisdiction of Opol. The office shall serve as the apprehending and settlement authority of all violators within Opol.
All other related function within the parameters are coordinated to the LGU Legal Counsel and the Sangguniang Bayan for proper guidance.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Circuit Trial Court',
                'dept_abbreviation' => '(MCTC)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
CRIMINAL CASE : Exclusive original jurisdiction over all violation of municipal ordinance committed within territorial jurisdiction
of Opol, Misamis Oriental and El salvador City; and Exclusive original jurisdiction over all offenses punishable by law with imprisonment
of not exceeding 6 years irrespective of the amount of fine and regardless of another impossible accessory or other penalties including
the civil liability arising from such offenses or predicated thereof irrespective of the kind, nature of value of the amount hereof. Provided,
however, that in offenses involving damage to property through criminal negligence, they shall have exclusive original jurisdiction thereof.

CIVIL CASES : Exclusive original jurisdiction over all civil actions and probate proceeding where value of the property
or amount of demand does not exceed Php 300,000 exclusive of interest, earning, or whatever kind, Attorney's litigation expenses
and cost; Exclusive original jurisdiction over cases of forcible entry and unlawful detainee; Exclusive original jurisdiction in all civil
action which involve title to, or possession of real property, or any interest therein where assessed value of the property or interest
therein does not exceed Twenty Thousand Pesos (Php 20,000.00), or, in civil actions in Metro Manila, where such assessed value does
not exceed Fifty Thousand Pesos (Php 50,000.00) exclusive of interest, damages, of whatever kind of Attorney's fees litigation expenses
& property shall be determined by the assess value of the adjacent lots; and Delegated jurisdiction in CADASTRAL/Land registration cases.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Local Governance Operations Officer',
                'dept_abbreviation' => '(MLGOO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Provides assistory and "see to it" functions in the implementation of the Local government Code; Provides consultancy,
brokering and technical assistance service to the LGU on Administration and Development concerns; Disseminate and
monitor compliance of directives in the implementation of laws, rules and regulation, policies and standards affecting the
Local Government Unit; Disseminates information regarding the Department and its services in the Municipal Government;
Establish and maintain data bank of Municipal/Barangay Officials; Plan, organize, direct, implement & monitor the Department
programs, projects & activities of the LGU; Promote the participation of citizens, NGO's & CSO's in local governance including
the maintenance of public order & safety; and Other functions as maybe directed by competent authority or by law.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Philippine National Police',
                'dept_abbreviation' => '(PNP)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Develop an effective public relations program to promote and maintain public understanding, confidence and support;
Executes promptly and faithfully all lawful orders of the local chief executive; Enforces all laws and ordinance of the
municipality; Takes charge of the municipal jail in the absence of BJMP and be responsible of the safekeeping and custody
of all prisoners; Conduct intelligence activities to identify crimes and offences that are likely to occur at prearrange time;
Conduct crime prevention programs to suppress and control the occurrence of crimes; Conduct investigation to all criminal
cases being reported/lodged at our office & to ascertain its veracity; Prepares criminal complaints and prosecutes cases
in coordination with Provincial Prosecutors Office; Provide training programs to Barangay Police, Barangay Intelligence
Network(BIN), and Traffic Enforcers; Control the vehicular movement on streets and highway within our AOR; Conduct
traffic investigation & provide assistance to motorist during emergencies/traffic incidents; and Conduct special anti-illegal
drug operations and anti-illegal gambling operations.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Bureau of Fire Protection',
                'dept_abbreviation' => '(BFP)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Develop an effective public relations program to promote and maintain public understanding, confidence and support;
Executes promptly and faithfully all lawful orders of the local chief executive; Enforces all laws and ordinance of the
municipality; Takes charge of the municipal jail in the absence of BJMP and be responsible of the safekeeping and custody
of all prisoners; Conduct intelligence activities to identify crimes and offences that are likely to occur at prearrange time;
Conduct crime prevention programs to suppress and control the occurrence of crimes; Conduct investigation to all criminal
cases being reported/lodged at our office & to ascertain its veracity; Prepares criminal complaints and prosecutes cases
in coordination with Provincial Prosecutors Office; Provide training programs to Barangay Police, Barangay Intelligence
Network(BIN), and Traffic Enforcers; Control the vehicular movement on streets and highway within our AOR; Conduct
traffic investigation & provide assistance to motorist during emergencies/traffic incidents; and Conduct special anti-illegal
drug operations and anti-illegal gambling operations.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Sangguniang Bayan',
                'dept_abbreviation' => '(SB)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The Sangguniang Bayan, as the legislative body of the LGU, shall enact ordinance, approve resolution & appropriate
funds for the general welfare of the LGU & its inhabitants in accordance with the existing laws & in the proper exercise
of its corporate powers as provided by law & shall : 1.) Generate & maximize the use of resources for the implementation
of development plans, programs, objectives & priorities of the LGU as provided by law with particular attention to agro-
industrial development, countrywide growth & progress; 2.) Subject to the provisions of existing laws, grant franchises,
enact ordinances authorizing the issuance of permits or licenses or enact ordinances levying taxes, fees & charges
upon such conditions & such purposes intended to promote the general welfare of the inhabitants of the municipality;
3.) Regulates activities relative to the use of land, buildings & structures within the LGU; 4.) Exercise such other powers
and perform such other duties and functions as may be prescribed by law or ordinance.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the SB Secretary',
                'dept_abbreviation' => '(SB SEC)',
                'dept_category_id' => 1,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Planning and Development Coordinator',
                'dept_abbreviation' => '(MPDC)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The Office of the Mun. Planning is spearheaded by the Mun. Planning & Dev't. Coordinator with the close coordination of the Mun. Mayor and
the Administrator. This office is responsible for the synchronization of all development planning and programming activities. And at the same time,
take charge of the monitoring & evaluation of the execution of the Comprehensive Land Use Plan, CLUP, & the implementation of different
projects and programs of the Local Government Unit. Major components of development planning involve the following:
1.) Development Planning; 2.) Research and Project Development; 3.) Data Banking Statistics; 4.) Support Services in Land Use;
5.) Implementation of the 20% Dev't. Projects; and 6.) Monitoring and evaluation.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Civil Registrar',
                'dept_abbreviation' => '(MCR)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
The Office of the Mun. Planning is spearheaded by the Mun. Planning & Dev't. Coordinator with the close coordination of the Mun. Mayor and
the Administrator. This office is responsible for the synchronization of all development planning and programming activities. And at the same time,
take charge of the monitoring & evaluation of the execution of the Comprehensive Land Use Plan, CLUP, & the implementation of different
projects and programs of the Local Government Unit. Major components of development planning involve the following:
1.) Development Planning; 2.) Research and Project Development; 3.) Data Banking Statistics; 4.) Support Services in Land Use;
5.) Implementation of the 20% Dev't. Projects; and 6.) Monitoring and evaluation.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Budget Office',
                'dept_abbreviation' => '(MBO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Prepare forms, orders and circulars embodying instructions on budgetary and appropriation matters; Review and
consolidate budget proposals of different department and offices of the Municipality of Opol; Study and evaluate
budgetary implications and submit comments and regulations thereon; Coordinate with the Treasurer and MPDC for
the purpose of budgeting; Assist various implementers to have minimal cost but maximum output; Guide budget implementer
in pushing for return of investment.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Accounting',
                'dept_abbreviation' => '(ACCOUNTING)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Install & maintain an internal audit system in the Local Government Unit (LGU); Certify the availability of budget allotment to all expenditures
& obligations may be properly charged; Review supporting documents before preparation of vouchers, to determine completeness of requirements.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Treasurer',
                'dept_abbreviation' => '(MTO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
Take custody and exercise proper management of the funds and take charge of the disbursement of all local government funds and ;
such other fund of which may be entrusted to him/her by law or other competent authority.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Assessor',
                'dept_abbreviation' => '(MASSO)',
                'dept_category_id' => 1,
                'mandate' => <<<'TEXT'
1. Ensure all laws and policies governing the appraisal and assessment of real properties for taxation purposes are properly executed.
2. Exercise the functions of appraisal and assessment primarily for taxation purposes of all real properties within the LGU Opol
    subject for review and approval of the Provincial Assessor.
3. Issue upon request of any interested party, certified copies of assessment records of all real property and all other records relative to
    its assessment upon payment of corresponding charges.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],

            // Social Services
            [
                'dept_name' => 'Office of the Municipal Health Officer',
                'dept_abbreviation' => '(MHO)',
                'dept_category_id' => 2,
                'mandate' => <<<'TEXT'
Supervise RHU Staff; Conduct medical, dental & pre-natal consultation; Perform normal spontaneous deliveries, minor
surgical procedures & circumcision; Perform primary laboratory examinations; Facilitate issuance of medical certificate,
health cards & sanitary permits; Implement health programs & deliver services on maternal & child health, family planning,
nutrition, healthy lifestyle, Disease free-zone initiatives, water & sanitation, HIV/AIDS Prevention & control program & blood
donation; supervise Adolescent Health & Youth Development, Attends to medico-legal cases, Refer patients to secondary &
tertiary hospitals, Deliver medical services during Serbisyo sa Barangay, Implement, deliver Philhealth Accredited services &
sponsor Philhealth Membership to pregnant women; Supervise health volunteers (BHW's & BNS).
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Social Welfare and Development Officer',
                'dept_abbreviation' => '(MSWDO)',
                'dept_category_id' => 2,
                'mandate' => <<<'TEXT'
Formulate measures for the approval of the SB & provide technical assistance & support to the LCE in carrying out measures
to ensure the delivery of basic services & provision of adequate facilities relative to social welfare & development services;
Develop plans & strategies & upon approval thereof by the LCE, implement the same particularly those which have to
do with social welfare programs & projects which the LCE is empowered to implement & which the SB is empowered
to provide for under RA-7160; The MSWDO shall 1.) identify the basic needs of the needy, the disadvantage & impoverished
& develop & appropriate measures to alleviate their problems & improve their living condition, 2.) provide relief & appropriate
crisis intervention for victims of abuse & exploitation & recommends appropriate measures to deter further abuse & exploitation
3.) assist the LCE in implementing the Brgy. Level program for the total development & protection of children up to 6 y/o
4.) facilitate the implementation of welfare programs for PWD, elderly & victims of drug addiction, the rehabilitation of prisoners
& parolees, the prevention of juvenile delinquencies & such such other activities which would eliminate or minimize the ill effects
of poverty, 5.) initiate & support youth welfare programs that will enhance the role of the youth in nation building, 6.) coordinate
with government agencies & NGO's which have for their purpose the promotion on the protection of all needy, disadvantaged,
under privileged or impoverished groups of individuals, particularly those identified to be vulnerable & high risk of exploitation,
abuse & neglect, 7.) be in the frontline of service delivery, particularly those which have to do with immediate relief during and
assistance in the aftermath of man-made & natural disaster & calamities, 8.) recommend to the SB & advice the LCE on all other
matters related to social welfare & development services which will improve the livelihood & living conditions of the inhabitants.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Municipal Youth Development Office',
                'dept_abbreviation' => '(MYDO)',
                'dept_category_id' => 2,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Municipal Disability Affairs Office',
                'dept_abbreviation' => '(MDAO)',
                'dept_category_id' => 2,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],

            // Economic Services
            [
                'dept_name' => 'Office of the Municipal Agriculturist',
                'dept_abbreviation' => '(MAO)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
Promotion of Agriculture & Fishery Programs(Cattle breeding, Research & Livelihood production) such as Agricultural Services,
Cop Production, Disease Prevention & Control, vaccination, de-worming and treatment and Fish Seeproduction & distribution;
Regulation of Agricultural & Fishery Activities, promote improved farm management and implement Fishery Law and enforced
surveillance; Conduct of Agricultural & Fishery Research Activities, Demonstration farms, Aviary and Fish ponds.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Engineering',
                'dept_abbreviation' => '(MEO)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
1. Initiate, review and recommend changes in policies, objectives, plans and programs, techniques, procedures and practices in
    infrastructure development and public works in general;
2. Administer, coordinate, supervise and control the construction, maintenance, improvement and repair of roads, bridges and other
    engineering and public work projects.
3. Provide engineering services including investigation and survey, engineering designs, feasibility studies and project management.
4. Act as a Building Official primarily responsible for the enforcement of the provisions of the National Building Code of the
    Philippines (P.D. 1096) and its IRR, as well as circulars, memoranda, opinions and decisions/orders issued pursuant thereto.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Building Official',
                'dept_abbreviation' => '(OBO)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
1. Initiate, review and recommend changes in policies, objectives, plans and programs, techniques, procedures and practices in
    infrastructure development and public works in general;
2. Administer, coordinate, supervise and control the construction, maintenance, improvement and repair of roads, bridges and other
    engineering and public work projects.
3. Provide engineering services including investigation and survey, engineering designs, feasibility studies and project management.
4. Act as a Building Official primarily responsible for the enforcement of the provisions of the National Building Code of the
    Philippines (P.D. 1096) and its IRR, as well as circulars, memoranda, opinions and decisions/orders issued pursuant thereto.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Tourism',
                'dept_abbreviation' => '(TOURISM)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
Initiate optimum contribution of tourism to economic growth of the municipality; Enhancement and contribution to social cohesion and cultural
preservation in Opol; Tourism development on an environmentally sustainable basis; Development of diversity of destinations, attractions &
market; and Preservation of cultural and historical sites.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Office of the Municipal Environment and Natural Resources',
                'dept_abbreviation' => '(MENRO)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
Formulate measures for the consideration of the Sanggunian & provide technical assistance & support to the Mayor, as the case maybe
in carrying out measures to ensure the delivery of basic services and provision of adequate facilities relative to environment and
natural resources services as provided for under Section 17 of the Local Government Code of 1991; Develop plans & strategies & upon
approval thereof by the mayor, as the case may be, implement the same, particularly natural resource programs & projects which the
Mayor is empowered to implement & which the Sanggunian is empowered to provide for under this code; Establish, maintain,
protect & preserve communal forests, watersheds, tree parks, mangroves, greenbelts, commercial forests & similar forest projects
like industrial tree farms & agro-forestry projects; Provide extension services to beneficiaries of forest development projects &
technical financial & infrastructure assistance; Manage & maintain seed banks & produce seedlings for forest & tree parks; Provide
extension services to beneficiaries of forest development projects & render assistance for natural related conservation & utilization
activities consistent with ecological balance; Promote the small-scale mining & utilization of mineral resources, particularly mining
of gold; Coordinate with government agencies & non-governmental organizations in the implementation of measures to prevent
& control land, air & water pollution with the assistance of the DENR; Be in the frontline of the delivery of services concerning the
environment & natural resources, particularly the renewal & rehabilitation of the environment during the aftermath of man-made & natural
disaster & calamities; Recommend to the Sanggunian & advise the Mayor, as the case maybe, on all matters relative to the
protection, conservation, maximum utilization, application of appropriate technology & other matters related to the environment
& natural resources; & Exercise such other powers & perform such other duties & functions as may be prescribed by law or ordinance.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Local Economic Investment Promotion Office',
                'dept_abbreviation' => '(LEIPO)',
                'dept_category_id' => 3,
                'mandate' => <<<'TEXT'
Encourage new investments and expansion of the municipality's preferred and priority areas on agriculture and other preferred
investments as maybe determined from time to time which will provide economic employment opportunities to raise standard of living
of the Opolanons. Initiate support activities like infrastructure such as communications, water supply, waterways and related
infrastructure, man-made or natural.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Municipal Cooperative and Development Office',
                'dept_abbreviation' => '(MCDO)',
                'dept_category_id' => 3,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],

            // Special Accounts
            [
                'dept_name' => 'Opol Community College',
                'dept_abbreviation' => 'OCC',
                'dept_category_id' => 4,
                'mandate' => <<<'TEXT'
Take control and management of Opol Community College Operation; and Take charge of the marketing strategy as well as
the repair of OCC building & facilities.
TEXT
                ,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Public Market',
                'dept_abbreviation' => 'PM',
                'dept_category_id' => 4,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ],
            [
                'dept_name' => 'Slaughterhouse',
                'dept_abbreviation' => 'SH',
                'dept_category_id' => 4,
                'mandate' => null,
                'created_at' => now(),
                'updated_at' => now()
            ]
        ]);
    }
}