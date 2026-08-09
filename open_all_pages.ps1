# open_all_pages.ps1
# Open all PHCL Super public pages in the default browser
$base = "C:/Users/Hp/Desktop/PHCL_Super/public"
$pages = @(
    "index.html",
    "exchange.html",
    "products.html",
    "product.html?sku=001",
    "profile.html",
    "privacy.html",
    "terms.html"
)
foreach($p in $pages){
    $path = Join-Path $base $p
    Write-Host "Opening $path"
    Start-Process -FilePath $path
    Start-Sleep -Milliseconds 250
}
