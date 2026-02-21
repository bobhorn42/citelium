## Surveillance d'un changement dans une page web
Le scrit réalise les actions suivantes:

- Crée une variable nommée limite_boucle avec la valeur 10
- Crée une variable nommée periode_courante avec la valeur 269680
- Crée une boucle qui s'exécute toutes les minutes jusqu'au maximum de limite_boucle itérations et réalise les actions suivantes :
  - Se connecte à https://complexe-citelium.fr/module-inscriptions/reserver/ et récupère le code source de la page 
  - Dans le code recherche la chaîne de caractères "onclick='update_link_periodes(" et récupère le nombre qui suit. Par exemple, si la chaîne est onclick='update_link_periodes(270364)', récupère le nombre 270364.
  - Si le nombre est égal à la valeur periode_courante, ne fais rien
  - Si le nombre est différent, met à jour la valeur de periode_courante avec ce nombre mais ne quitte pas la boucle pour détecter un nouveau changement éventuel et envoie un email pour signaler le changement.
- A la fin de la boucle envoie un email pour signaler que la boucle s'est arrêté.
