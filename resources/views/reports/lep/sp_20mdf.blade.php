{{--
    resources/views/reports/lep/sp_20mdf.blade.php
    ──────────────────────────────────────────────────────────────────────────
    SPECIAL PROVISIONS: 20% MUNICIPAL DEVELOPMENT FUND
    Same whole-document-editable pattern as personnel_amelioration /
    administrative_procedures.

    Variables expected:
      $content   string  — full HTML of the document
      $editable  bool    — true = editor page, false/absent = PDF render
--}}

@php
$defaultContent = <<<'HTML'
<div class="sp-title">SPECIAL PROVISIONS: 20% MUNICIPAL DEVELOPMENT FUND, CY 2027</div>

<div class="sp-item">
  <span class="sp-lead">Use and Release of Fund.</span>
  <div class="sp-body">
    <p>The 20% Development Fund shall be strictly utilized in accordance with the general policies prescribed under DBM-Department of Finance-DILG JMC No. 1 dated November 4, 2020, and for the projects included in the approved AIP of the LGU for FY 2026. The development projects identified shall be consistent with the local development plan duly approved by the Local Development Council and local sanggunian. The disbursement of this fund shall be based on the approved Project Procurement Management Plan for FY 2026, and shall be subject to all existing budgeting, accounting, and auditing laws, rules, and regulations.</p>
  </div>
</div>

<div class="sp-heading">GENERAL PROVISION</div>

<div class="sp-item">
  <span class="sp-num">1.</span>
  <span class="sp-text">In accordance with Section 287 of RA No. 7160, every LGU shall appropriate in its annual budget no less than twenty percent (20%) of its annual IRA for development projects.</span>
</div>
<div class="sp-item">
  <span class="sp-num">2.</span>
  <span class="sp-text">The 20% Development Fund shall be utilized to finance the LGU's priority development projects, as embodied in its duly approved local development plans and Annual Investment Program (AIP), which should be directly supportive of the Philippine Development Plan and Public Investment Program.</span>
</div>
<div class="sp-item">
  <span class="sp-num">3.</span>
  <span class="sp-text">All development projects to be funded under the 20% Development Fund shall contribute to the attainment of desirable socio-economic development and environmental management outcomes of the LGU, and shall partake the nature of investment or capital expenditures.</span>
</div>

<div class="sp-heading">ALLOWABLE DEVELOPMENT PROJECTS CHARGEABLE AGAINST THE 20% DEVELOPMENT FUND</div>

<div class="sp-item">
  <span class="sp-num">1.</span>
  <span class="sp-lead">Social Development</span>
  <div class="sp-sublist">
    <p><span class="sp-subnum">1.1</span> Construction or rehabilitation of health centers, rural health units or hospitals, including purchase of lot for the purpose.</p>
    <p><span class="sp-subnum">1.2</span> Purchase of ambulance and medical equipment.</p>
    <p><span class="sp-subnum">1.3</span> Construction or rehabilitation of local government-owned potable water supply system.</p>
    <p><span class="sp-subnum">1.4</span> Establishment or rehabilitation of Manpower Development Centers.</p>
    <p><span class="sp-subnum">1.5</span> Construction or rehabilitation of evacuation centers, including purchase of lot for the purpose.</p>
    <p><span class="sp-subnum">1.6</span> Construction of Special Drug Education Centers and Drug Treatment/Rehabilitation Centers, including purchase of lot for the purpose.</p>
    <p><span class="sp-subnum">1.7</span> Rehabilitation of historical sites classified as such by the National Historical Commission of the Philippines.</p>
    <p><span class="sp-subnum">1.8</span> Purchase and development of land for the relocation of informal settlers and relocation of victims of calamities.</p>
    <p><span class="sp-subnum">1.9</span> Construction or rehabilitation of multi-purpose halls, including purchase of lot for the purpose.</p>
    <p><span class="sp-subnum">1.10</span> Installation of street lighting system.</p>
  </div>
</div>

<div class="sp-item">
  <span class="sp-num">2.</span>
  <span class="sp-lead">Economic Development</span>
  <div class="sp-sublist">
    <p><span class="sp-subnum">2.1</span> Construction or rehabilitation of communal irrigation or water impounding system.</p>
    <p><span class="sp-subnum">2.2</span> Purchase or lease of post-harvest facilities, such as farm or hand tractor with trailer, thresher and mechanical driers.</p>
    <p><span class="sp-subnum">2.3</span> Construction or rehabilitation of local roads or bridges, including purchase of appropriate engineering equipment, such as dump trucks, graders and pay loaders.</p>
    <p><span class="sp-subnum">2.4</span> Capital expenditures related to the implementation of livelihood or entrepreneurship/local economic development projects.</p>
    <p><span class="sp-subnum">2.5</span> Development of alternative power or energy sources, such as, but not limited to, renewable energy power plants.</p>
    <p><span class="sp-subnum">2.6</span> Amortization of loans used to finance development projects cited in this provision, subject to the 20% debt service cap prescribed under Section 324 (b) of RA 7160.</p>
  </div>
</div>

<div class="sp-item">
  <span class="sp-num">3.</span>
  <span class="sp-lead">Environmental Management</span>
  <div class="sp-sublist">
    <p><span class="sp-subnum">3.1</span> Reforestation and urban greening.</p>
    <p><span class="sp-subnum">3.2</span> Construction or rehabilitation of sanitary landfills and materials recovery facility.</p>
    <p><span class="sp-subnum">3.3</span> Purchase of garbage trucks and other equipment for environmental management and protection purposes.</p>
    <p><span class="sp-subnum">3.4</span> Implementation of flood and erosion control projects, such as rehabilitation and construction of drainage systems, de-silting of rivers and de-clogging of canals.</p>
    <p><span class="sp-subnum">3.5</span> Other environmental management projects that promote air and water quality, as well as productivity of the coastal or freshwater habitat, agricultural land and forest land, such as, but not limited to, treatment of wastewater for conservation/re-use purposes, and installation of air pollution control devices.</p>
  </div>
</div>

<div class="sp-item">
  <span class="sp-num">4.</span>
  <span class="sp-lead">Expenditure items not allowed to be charged against the 20% Development Fund</span>
  <div class="sp-sublist">
    <p><span class="sp-subnum">4.1</span> Personal services expenditures, such as salaries, wages, overtime pay and other personnel benefits.</p>
    <p><span class="sp-subnum">4.2</span> Administrative expenses, such as supplies, meetings, communication, water and electricity, petroleum products, other general services, and the like.</p>
    <p><span class="sp-subnum">4.3</span> Traveling expenses, whether domestic or foreign.</p>
    <p><span class="sp-subnum">4.4</span> Registration or participation fees in training, seminars, conferences or conventions.</p>
    <p><span class="sp-subnum">4.5</span> Purchase of administrative office furniture, fixtures, equipment or appliances.</p>
    <p><span class="sp-subnum">4.6</span> Purchase, maintenance or repair of motor vehicles or motorcycles, other than those specified in item 2.0 hereof.</p>
  </div>
</div>
HTML;

$content = $content ?? $defaultContent;
$editable = $editable ?? false;
@endphp

<style>
  .sp-title {
    text-align: center;
    font-weight: bold;
    font-size: 8pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .sp-heading {
    font-weight: bold;
    font-size: 7.5pt;
    text-transform: uppercase;
    margin: 10px 0 6px 0;
  }
  .sp-item { margin-bottom: 8px; font-size: 7pt; line-height: 1.5; text-align: justify; }
  .sp-num  { font-weight: normal; }
  .sp-lead { font-weight: bold; text-decoration: underline; }
  .sp-text { }
  .sp-body { margin-left: 0; margin-top: 2px; }
  .sp-body p { margin-bottom: 4px; }
  .sp-sublist { margin-left: 18pt; margin-top: 2px; }
  .sp-sublist p { margin-bottom: 3px; }
  .sp-subnum { font-weight: bold; margin-right: 4pt; }
</style>

<div class="sp-print-wrap">
  {!! $content !!}
</div>
