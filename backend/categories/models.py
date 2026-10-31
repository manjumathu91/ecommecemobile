from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base, n = slugify(self.name), 1
            self.slug = base
            while Category.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                n += 1
                self.slug = f"{base}-{n}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
