## Surveillance d'un changement dans une page web
Le scrit réalise les actions suivantes:

- Se connecte à https://complexe-citelium.fr/module-inscriptions/reserver/ et récupère le code source de la page 
- Dans le code recherche la chaîne de caractères "onclick='update_link_periodes(" et récupère le nombre qui suit. Par exemple, si la chaîne est onclick='update_link_periodes(270364)', récupère le nombre 270364.
  - Si le nombre est égal à la valeur periode_courante, ne fais rien
  - Si le nombre est différent, met à jour la valeur de periode_courante avec ce nombre et signale le changement.
- Le script s'appelle lui-même toutes les minutes
