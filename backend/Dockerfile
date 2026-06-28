FROM richarvey/nginx-php-fpm:3.1.6

# Copy project files
COPY . /var/www/html

# Environment variables
ENV WEBROOT /var/www/html/public
ENV APP_ENV production
ENV COMPOSER_ALLOW_SUPERUSER 1

# Install composer dependencies
RUN composer install --no-dev --optimize-autoloader

# Correct folder permissions for Laravel
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
RUN chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80
