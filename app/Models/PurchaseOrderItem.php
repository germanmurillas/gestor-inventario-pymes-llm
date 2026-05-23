<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model {
    protected $fillable = ['purchase_order_id', 'material_id', 'quantity', 'unit_cost', 'received_qty'];

    protected function casts(): array {
        return ['quantity' => 'decimal:2', 'unit_cost' => 'decimal:2', 'received_qty' => 'decimal:2'];
    }

    public function purchaseOrder(): BelongsTo {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function material(): BelongsTo {
        return $this->belongsTo(Material::class);
    }
}
