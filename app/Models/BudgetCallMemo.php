<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetCallMemo extends Model
{
    protected $table = 'budget_call_memos';
    protected $primaryKey = 'budget_call_memos_id';

    protected $fillable = [
        'year',
        'title',
        'original_filename',
        'file_path',
        'file_size',
        'sort_order',
        'uploaded_by',
    ];

    protected $casts = [
        'year'       => 'integer',
        'sort_order' => 'integer',
        'file_size'  => 'integer',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by', 'user_id');
    }
}
