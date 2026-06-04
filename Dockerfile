FROM php:8.2-apache

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    libssl-dev \
    pkg-config \
    unzip \
    zip \
    libzip-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar extensión zip de PHP
RUN docker-php-ext-install zip

# Instalar extensión MongoDB
RUN pecl install mongodb-1.19.0 && docker-php-ext-enable mongodb

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copiar archivos
COPY . /var/www/html/

# Instalar dependencias PHP
WORKDIR /var/www/html
RUN composer install --no-interaction --optimize-autoloader --ignore-platform-req=ext-mongodb

# Permisos
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
