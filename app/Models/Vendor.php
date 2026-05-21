<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model {
    protected $fillable = ['name', 'contact_name', 'email', 'phone', 'address', 'notes'];
}
