# Platformă extensibilă pentru prelucrarea și raportarea datelor

## Descriere
Proiectul are ca scop dezvoltarea unei platforme modulare destinată prelucrării și raportării datelor, având ca studiu de caz un sistem simplificat de **trading automat de arbitraj**.  
Lucrarea urmărește analiza comparativă dintre două implementări arhitecturale una bazată pe **design patterns** (Observer Pattern) și una procedurală (fără pattern-uri) pentru a evidenția impactul modelelor de proiectare asupra eficienței și performanței sistemelor software.

---

## Context și idee de bază
Scenariul propus presupune un **trading bot de arbitraj** care urmărește diferențele de preț pentru aceeași criptomonedă între două exchange-uri și execută tranzacții automate (simbolice) atunci când diferența depășește un prag definit.

Pentru compararea abordărilor se implementează două metode distincte de actualizare a datelor:

1. **Varianta procedurală (Polling)**  
   - Sistemul interoghează periodic (ex. la fiecare *n* secunde) prețurile de la fiecare exchange prin apeluri HTTP REST.  
   - Logica este liniară și blocantă, necesitând resurse constante pentru reîmprospătarea datelor.  
   - Această metodă este asociată cu un anti-pattern de tip *tight coupling* și *busy waiting*.

2. **Varianta bazată pe Observer Pattern (WebSocket Streaming)**  
   - Sistemul se abonează la fluxurile de date în timp real oferite de exchange-uri (prin WebSocket API).  
   - Fiecare nou eveniment de tip *price update* este transmis asincron observatorilor înregistrați (ex. strategiile de arbitraj).  
   - Abordarea este modulară, reactivă și optimizează consumul de resurse.

---

## Obiectivele comparative
Compararea celor două variante urmărește:
- **Performanța** – timpul mediu de reacție la modificarea prețului;  
- **Consumul de resurse** – utilizarea CPU și memorie;  
- **Scalabilitatea** – ușurința extinderii către noi exchange-uri sau strategii;  
- **Eficiența logicii de tranzacționare** – numărul și valoarea tranzacțiilor reușite într-un interval de timp;  
- **Mentenabilitatea** – nivelul de decuplare, claritatea și reutilizarea codului.

---

## Structura proiectului
1. **Introducere** – contextul teoretic și motivația proiectului.  
2. **Modele de proiectare** – prezentarea pattern-urilor relevante și a anti-pattern-urilor asociate.  
3. **Implementare practică** – dezvoltarea celor două versiuni (Polling și Observer/WebSocket).  
4. **Analiza performanței** – măsurarea timpilor de reacție, a consumului de resurse și a rezultatelor economice simulate.  
5. **Concluzii** – interpretarea rezultatelor și formularea de recomandări privind utilizarea design patterns în sisteme de tranzacționare automată.

---

## Etape de dezvoltare
1. Definirea arhitecturii generale și a modulelor sistemului (Feed, Strategy, Executor, Logger).  
2. Implementarea versiunii fără pattern-uri (Polling, cod procedural).  
3. Implementarea versiunii bazate pe Observer Pattern (streaming prin WebSocket).  
4. Simularea execuțiilor și colectarea datelor de performanță.  
5. Analiza comparativă și documentarea rezultatelor.

---

## Rezultate așteptate
- Reducerea latenței și a încărcării CPU în versiunea bazată pe Observer Pattern.  
- Creșterea scalabilității și modularității prin arhitectură orientată pe evenimente.  
- Demonstrarea impactului pozitiv al design pattern-urilor asupra performanței și mentenabilității aplicațiilor.  
- Ilustrarea modului în care abordările naive (anti-pattern-uri) pot afecta performanța și stabilitatea sistemelor de trading.

---

## Observații tehnice
- **Polling** se va realiza prin apeluri REST periodice la endpoint-uri publice (simulări locale sau API-uri reale de test).  
- **Streaming-ul prin WebSocket** reflectă comportamentul unui sistem *event-driven* și servește ca analog arhitectural pentru **Observer Pattern**.  
- Tranzacțiile sunt simulate; nu se realizează execuții reale pe piață.  
- Măsurătorile pot include: timpi de răspuns, consum mediu de CPU/memorie, latență între eveniment și execuție, precum și profit/pierdere teoretică în intervalul de testare.

---

## Concluzie
Proiectul ilustrează modul în care aplicarea adecvată a modelelor de proiectare comportamentale, precum **Observer Pattern**, poate conduce la o creștere semnificativă a eficienței și scalabilității sistemelor software distribuite și reactive, comparativ cu implementările clasice, procedurale.
