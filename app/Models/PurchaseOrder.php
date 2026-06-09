<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrder extends Model {
    use HasFactory;
    protected $fillable = ['po_number', 'status', 'vendor_id', 'created_by', 'submitted_by',
        'date_expected', 'approved_by', 'ship_to', 'bill_to', 'notes', 'total_cost'];

    protected function casts(): array {
        return ['date_expected' => 'date', 'total_cost' => 'decimal:2'];
    }

    public function items(): HasMany {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function vendor(): BelongsTo {
        return $this->belongsTo(Vendor::class);
    }

    public function creator(): BelongsTo {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updateTotalCost(): void {
        $this->total_cost = $this->items->sum(fn($i) => $i->quantity * $i->unit_cost);
        $this->save();
    }
}
