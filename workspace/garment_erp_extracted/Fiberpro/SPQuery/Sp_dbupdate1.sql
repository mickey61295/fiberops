 /*                  



;=============================================                  



; Author  :  Global Software's                  



; Create date  :  01/Nov/2019                  



; Create By  :  ASLAM                  



; Description  :  Stored Procedure for Posting the Production Details for commando cloud



; Change Person  :  ASLAM                



; Last Change Date :  26/May/2021 11.10 AM                  



; =============================================   */ 



CREATE Procedure Sp_dbupdate1 (@id int)  As 



EXEC ('alter table Temp_StkReports add SubProcess varchar(50) null')

EXEC ('ALTER TABLE TempIoHisLedger ADD SubProcess Varchar(50)')

EXEC ('ALTER TABLE Tempiohisright ADD SubProcess Varchar(50)')

 