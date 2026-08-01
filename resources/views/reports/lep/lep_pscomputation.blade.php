{{--
    resources/views/reports/lep/lep_pscomputation.blade.php
    ─────────────────────────────────────────────────────────────────────────
    PART IV: PS COMPUTATION — Local Expenditure Program version

    Mirrors UnifiedReportController's pscomputation block but:
      • No signatories / "Prepared by" block
      • Rendered via lepreport.blade.php using report_type = 'lep_pscomputation'

    Variables expected:
      $data  array  (see UnifiedReportController::buildPsComputationData /
                          LEPReportController::buildLepPsComputationData)
--}}

@php
$year        = $data['year'];
$incomeYear  = $data['income_year'];
$lgu         = $data['lgu'];

$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';

$pf = function($n) use ($pesoSign): string {
    if ((float)$n == 0) return '';
    return $pesoSign . number_format((float)$n, 2);
};
$pa = function($n) use ($pesoSign): string {
    return $pesoSign . number_format((float)$n, 2);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 2);
};
$nfA = function($n): string {
    return number_format((float)$n, 2);
};
@endphp

<div style="page-break-after: always;">

<div style="text-align:center; font-weight:bold; font-size:8.5pt; margin-bottom:6px; text-transform:uppercase;">
    PART IV: PS Computation
</div>

<div style="text-align:center;font-size:7pt;font-weight:bold;margin-bottom:1px;">{{ $lgu }}</div>
<div style="text-align:center;font-size:8pt;font-weight:bold;text-transform:uppercase;margin-bottom:5px;margin-top:3px;">
    PS COMPUTATION CY-{{ $year }}
</div>

<table class="data-table" style="font-size:7pt; border:1px solid #000;">
    {{-- Ghost row for column widths --}}
    <tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:40%;padding:0;border:none;"></td>
        <td style="width:25%;padding:0;border:none;"></td>
        <td style="width:20%;padding:0;border:none;"></td>
    </tr>
    <tbody>

    {{-- ── TOP SECTION ── --}}

    <tr>
        <td colspan="5" class="l" style="border-top:1px solid #000;border-right:none;border-bottom:none;padding:2px 4px;">
            Total Income from sources realized from next preceding year <strong>{{ $incomeYear }}</strong>
        </td>
        <td class="r" style="border-top:1px solid #000;border-left:none;border-bottom:none;padding:2px 4px;">
            {!! $pa($data['total_income']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Less : Non-Recurring Income
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nfA($data['non_recurring']) !!}
        </td>
    </tr>

    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            Total Realized Regular Income from next preceding year ({{ $incomeYear }})
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['total_realized']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Less : Personnel Services Limitation (45%)
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['ps_limitation']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Total Personnel Services for {{ $year }} - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['total_ps_gf']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Excess Amount
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nfA($data['excess_amount']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td colspan="6" class="l" style="border:none;padding:2px 4px;">
            Add: Waived Items
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;">
            Terminal Leave - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['terminal_leave_gf']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;">
            Monetization - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['monetization_gf']) !!}
        </td>
    </tr>
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            Total Waived Items
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['total_waived']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:6px;"></td></tr>

    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            Amount Allowable
        </td>
        <td class="r" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            {!! $pa($data['amount_allowable']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:10px;"></td></tr>

    <tr>
        <td colspan="6" class="l" style="border:none;padding:3px 4px;font-weight:bold;font-size:7pt;">
            Personnel Services for Existing Plantilla Position
        </td>
    </tr>

    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            A. Salaries/Wages of Current Personnel
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;font-weight:bold;">
            {!! $pa($data['salaries_wages']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td style="border:none;"></td>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            B. Statutory &amp; Contractual Obligation
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Retirement &amp; Life Insurance Premiums
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['retirement_insurance']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Pag-IBIG Contributions
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['pag_ibig']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            PhilHealth Contributions
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['philhealth']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Employees Compensation Insurance Premiums
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['ec_insurance']) !!}
        </td>
    </tr>

    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            Sub Total
        </td>
        <td class="r" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['subtotal_b']) !!}
        </td>
    </tr>

    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    <tr>
        <td style="border:none;"></td>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            C. Existing Allowances &amp; Benefits of Regular Employees
        </td>
    </tr>
    @php
    $cItems = [
        ['label' => 'PERA',                                          'key' => 'pera',               'peso' => true],
        ['label' => 'Representation Allowance',                      'key' => 'representation',     'peso' => false],
        ['label' => 'Transportation Allowance',                      'key' => 'transportation',     'peso' => false],
        ['label' => 'Clothing Allowance',                            'key' => 'clothing',           'peso' => false],
        ['label' => 'Magna Carta Benefits of Public Health Workers', 'key' => 'magna_carta',        'peso' => false],
        ['label' => 'Hazard Pay',                                    'key' => 'hazard_pay',         'peso' => false],
        ['label' => 'Honoraria',                                     'key' => 'honoraria',          'peso' => false],
        ['label' => 'Overtime Pay',                                  'key' => 'overtime_pay',       'peso' => false],
        ['label' => 'Cash Gift',                                     'key' => 'cash_gift',          'peso' => false],
    ];
    @endphp
    @foreach($cItems as $ci)
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            {{ $ci['label'] }}
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $ci['peso'] ? $pf($data[$ci['key']]) : $nf($data[$ci['key']]) !!}
        </td>
    </tr>
    @endforeach

    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Bonus
        </td>
        <td style="border:none;border-left:none;"></td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td class="l" style="border:none;padding:2px 4px;">
            Mid-Year
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['mid_year_bonus']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td class="l" style="border:none;padding:2px 4px;">
            Year-End
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['year_end_bonus']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Terminal Leave
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['terminal_leave']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Productivity Enhancement Incentive
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['productivity_incentive']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Other Benefits (Monetization)
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['monetization']) !!}
        </td>
    </tr>

    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            Sub Total
        </td>
        <td class="r" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['subtotal_c']) !!}
        </td>
    </tr>

    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            Total Personnel Services for {{ $year }}
        </td>
        <td class="r" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            {!! $pa($data['total_ps']) !!}
        </td>
    </tr>

    </tbody>
</table>

{{-- ── No signatories block in LEP version ── --}}

</div>{{-- /page wrapper --}}
