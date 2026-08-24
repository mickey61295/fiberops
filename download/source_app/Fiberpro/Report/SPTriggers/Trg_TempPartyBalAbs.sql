/*
;=============================================            
; Author  :  Global Software's            
; Create date  :  23/Jul/2022            
; Create By  :  ASLAM            
; Description  :  Trigger for IPAddress Update
; Change Person  :  ASLAM          
; Last Change Date :  23/Jul/2022 10.00 AM            
; =============================================   */     
CREATE TRIGGER Trg_TempPartyBalAbs ON TempPartyBalAbs AFTER INSERT AS 
BEGIN
    SET NOCOUNT ON;
     DECLARE @IDStr Varchar(30)

		 DECLARE @ID int
	 SELECT @ID = ID FROM INSERTED
        SELECT @IDStr =  hostname FROM sys.sysprocesses WHERE spid = @@SPID
        Update TempPartyBalAbs SET ipaddress = @IDStr Where ID = @Id
END