[out:json][timeout:180];
area["name"="Ontario"]["admin_level"="4"]->.o;
(nwr(area.o)["amenity"~"^(bar|pub|nightclub|biergarten)$"];);
out tags center;
