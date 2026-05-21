<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomFieldDefinition extends Model {
    protected $table = 'custom_field_definitions';

    protected $fillable = [
        'name', 'key', 'type', 'options', 'sort_order',
        'active', 'required', 'default_value', 'applies_to',
    ];

    protected function casts(): array {
        return [
            'options'  => 'json',
            'active'   => 'boolean',
            'required' => 'boolean',
        ];
    }
}
