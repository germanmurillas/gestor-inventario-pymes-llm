#!/bin/bash
set -e

# Laravel boot
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force

# Run nginx + php-fpm
nginx
php-fpm
