Ta Mission: Refactorer le code tout en t’assurant qu’il n’y a pas de régression.

Pour t’orienter dans ta démarche, voici les éléments qui vont être pris en considération:

- Les tests: La couverture des différents cas métiers.
- Le fonctionnel: Pas de régression par rapport au code existant.
- La complexité: Respect des bonnes pratiques (eg. SRP) et architecture de code.
- La lisibilité: “Combien de temps mettrait un autre développeur pour comprendre ton code”

Last tips:

- Le fichier README.md contient les instructions pour lancer les tests sur ta machine.
- Des squelettes de tests sont fournis dans la codebase ✅
- N’hésite pas à me contacter en cas de besoin.

## Cahier de charges

Bonjour et bienvenue dans l'équipe de Merjane, le leader de la vente en ligne à Aïn Sebaâ.

Chez Merjane, nous faisons de notre mieux chaque jour pour fournir à nos clients les produits qu'ils aiment et leur assurer une satisfaction maximale. C'est pour cela que nous gardons un œil attentif sur la disponibilité et la qualité de nos produits.

Notre équipe informatique dont vous faites partie a mis en place un système pour suivre notre inventaire. Il a été développé par Hamid, une personne pleine de bon sens qui est partie pour de nouvelles aventures.

Mais d'abord, laissez-moi vous présenter notre système :

- Tous les produits ont une valeur `available` qui désigne le nombre d'unités disponibles en stock.

- Tous les produits ont une valeur `leadTime` qui désigne le nombre de jours nécessaires pour le réapprovisionnement.

- À la fin de chaque commande, notre système décrémente la valeur `available` pour chaque produit commandé.

Jusqu'ici, tout va bien. Mais voici où ça se corse :

- Les produits **"NORMAL"** ne présentent aucune particularité. Lorsqu'ils sont en rupture de stock, un délai est simplement annoncé aux clients.

- Les produits **"SEASONAL"** ne sont disponibles qu'à certaines périodes de l'année. Lorsqu'ils sont en rupture de stock, un délai est annoncé aux clients, mais si ce délai dépasse la saison de disponibilité, le produit est considéré comme non disponible. Quand le produit est considéré comme non disponible, les clients sont notifiés de cette indisponibilité.

- Les produits **"EXPIRABLE"** ont une date d'expiration. Ils peuvent être vendus normalement tant qu'ils n'ont pas expiré, mais ne sont plus disponibles une fois la date d'expiration passée.
