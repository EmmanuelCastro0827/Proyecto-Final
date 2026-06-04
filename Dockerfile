FROM php:8.2-apache

# Instalar extensión MongoDB
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copiar archivos del proyecto
COPY . /var/www/html/

# Instalar dependencias
RUN composer install --no-interaction --optimize-autoloader

# Permisos
RUN chown -R www-data:www-data /var/www/html
