# Kalıp Atölyesi Yönetim Sistemi - Kurulum Rehberi

## Genel Bakış

Bu sistem, kalıp atölyelerinin üretim süreçlerini kapsamlı bir şekilde yönetmek için tasarlanmıştır. Sistem aşağıdaki özellikleri içerir:

- **Kalıp Yönetimi**: Kalıp tanımları ve bileşen seçimi
- **Üretim Emirleri**: Kalıplar için üretim emirlerinin oluşturulması ve takibi
- **İş Emirleri**: Bileşen bazında iş emirleri ve operasyon adımları
- **Çalışma Merkezleri**: Makine ve iş istasyonu yönetimi
- **Stok Yönetimi**: Çelik ürünler, lotlar ve stok hareketleri

## Başlangıç Kurulumu

### 1. Çalışma Merkezleri Oluşturma

İlk olarak, atölyenizdeki makineleri ve iş istasyonlarını tanımlayın:

1. **Çalışma Merkezleri** sekmesine gidin
2. "Yeni Çalışma Merkezi" butonuna tıklayın
3. Aşağıdaki örnek merkezleri oluşturun:
   - Testere 1 (Kesim)
   - CNC Torna 1 (Tornalama)
   - Freze 1 (Frezeleme)
   - Taşlama 1 (Taşlama)
   - EDM 1 (Elektro Erezyon)

### 2. Bileşen Tiplerini ve BOM'ları Tanımlama

Veritabanında aşağıdaki SQL komutlarını çalıştırarak örnek bileşen tiplerini ve operasyon rotalarını oluşturun:

```sql
-- Solid Kalıp Bileşenleri
INSERT INTO component_types (name, die_type, description) VALUES
('Havuz', 'Solid', 'Havuz bileşeni'),
('Destek', 'Solid', 'Destek bileşeni'),
('Kapak', 'Solid', 'Kapak bileşeni'),
('Bolster', 'Solid', 'Bolster bileşeni');

-- Portol Kalıp Bileşenleri
INSERT INTO component_types (name, die_type, description) VALUES
('Köprü', 'Portol', 'Köprü bileşeni'),
('Dişi', 'Portol', 'Dişi bileşeni'),
('Destek', 'Portol', 'Destek bileşeni'),
('Bolster', 'Portol', 'Bolster bileşeni');
```

Her bileşen tipi için operasyon rotaları (BOM) oluşturun. Örnek:

```sql
-- Havuz için operasyon rotası
-- (work_center_id'leri kendi sisteminize göre güncelleyin)
INSERT INTO component_bom (component_type_id, sequence_number, operation_name, work_center_id, estimated_duration_minutes)
SELECT
  (SELECT id FROM component_types WHERE name = 'Havuz' AND die_type = 'Solid'),
  1, 'Kesim',
  (SELECT id FROM work_centers WHERE name = 'Testere 1'),
  30;

INSERT INTO component_bom (component_type_id, sequence_number, operation_name, work_center_id, estimated_duration_minutes)
SELECT
  (SELECT id FROM component_types WHERE name = 'Havuz' AND die_type = 'Solid'),
  2, 'Tornalama',
  (SELECT id FROM work_centers WHERE name = 'CNC Torna 1'),
  120;

-- Diğer bileşenler için benzer şekilde devam edin...
```

### 3. Çelik Ürünleri Tanımlama

1. **Stok Yönetimi** sekmesine gidin
2. **Çelik Ürünler** alt sekmesini seçin
3. Kullandığınız çelik ürünlerini ekleyin:
   - Alaşım: H13, Çap: 150mm
   - Alaşım: H13, Çap: 200mm
   - Alaşım: D2, Çap: 100mm
   - vb.

### 4. Lot Ekleme

1. **Stok Yönetimi** > **Lotlar** sekmesine gidin
2. Her çelik ürün için lot bilgilerini girin:
   - Çelik Ürün
   - Sertifika Numarası
   - Tedarikçi
   - Uzunluk (mm)
   - Brüt Ağırlık (kg)
   - Giriş Tarihi

## Kullanım Akışı

### Yeni Kalıp Oluşturma

1. **Kalıplar** sekmesine gidin
2. "Yeni Kalıp" butonuna tıklayın
3. Kalıp bilgilerini girin:
   - Kalıp Numarası (benzersiz)
   - Kalıp Tipi (Solid veya Portol)
   - Kalıp Çapı (mm)
   - Toplam Paket Uzunluğu (mm)
   - Tasarım Dosyası URL (opsiyonel)

4. Bileşenleri ekleyin:
   - "Bileşen Ekle" butonuna tıklayın
   - Bileşen Tipini seçin (kalıp tipine göre otomatik filtrelenir)
   - Çelik Ürünü seçin
   - Paket Uzunluğunu girin
   - Teorik tüketim otomatik hesaplanır

5. "Kalıp Oluştur" butonuna tıklayın

### Üretim Emri Oluşturma

1. Kalıp kartında "Üretim Emri Oluştur" butonuna tıklayın
2. Sistem otomatik olarak:
   - Bir üretim emri oluşturur
   - Her bileşen için bir iş emri oluşturur
   - Her iş emri için BOM'daki operasyonları kopyalar

### İş Emirlerini Takip Etme

1. **İş Emirleri** sekmesine gidin
2. Bir iş emri seçin
3. Her operasyonu sırayla başlatın ve tamamlayın:
   - "Başlat" butonuna tıklayın (opsiyonel: operatör adı girin)
   - İşlem bittiğinde "Tamamla" butonuna tıklayın

4. Tüm operasyonlar tamamlandığında "İş Emrini Tamamla" butonuna tıklayın:
   - Gerçek çelik tüketimini girin
   - Kullanılan lot'u seçin
   - Sistem otomatik olarak stoktan düşer

### Çalışma Merkezlerini İzleme

1. **Çalışma Merkezleri** sekmesine gidin
2. Bir makine seçin
3. Aktif operasyonları ve kuyruğu görüntüleyin
4. Makine durumunu güncelleyin (Müsait / Meşgul / Bakımda)

### Stok Takibi

1. **Stok Yönetimi** > **Lotlar** sekmesinde:
   - Her lotun kalan miktarını görüntüleyin
   - Yeşil: Stok var
   - Kırmızı: Stok tükendi

2. **Stok Hareketleri** sekmesinde:
   - Tüm tüketimleri tarihsel olarak görüntüleyin
   - Hangi iş emrinde ne kadar çelik kullanıldığını takip edin

## Önemli Notlar

### Teorik vs Gerçek Tüketim

- **Teorik Tüketim**: Sistem, paket uzunluğu ve çap kullanarak otomatik hesaplar
  - Formül: `(uzunluk_mm × çap_mm² × π × 7.85) / 4,000,000`
- **Gerçek Tüketim**: İş emri tamamlandığında manuel olarak girilir
- Her iki değer de kayıt altında tutulur ve karşılaştırılabilir

### Stok Yönetimi

- Teorik tüketim stoktan düşmez
- Sadece gerçek tüketim, iş emri tamamlandığında stoktan düşer
- Sistem, yetersiz stok durumunda uyarı verir

### İş Emri Operasyonları

- Operasyonlar, BOM'dan kopyalanır
- Varsayılan çalışma merkezi BOM'dan gelir
- İhtiyaç durumunda operasyon başına çalışma merkezi değiştirilebilir

### Kalıp Durumları

- **Taslak**: Yeni oluşturuldu, henüz üretim emri yok
- **Hazır**: Üretim emri oluşturuldu
- **Üretimde**: Üretim emri devam ediyor
- **Tamamlandı**: Tüm iş emirleri tamamlandı

## Veri Güvenliği

Sistem, Supabase Row Level Security (RLS) kullanır:
- Tüm tablolarda RLS etkin
- Sadece kimliği doğrulanmış kullanıcılar erişebilir
- Veri kaybı riskini minimize etmek için güvenli operasyonlar kullanılır
