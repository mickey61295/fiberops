 /*                  
;=============================================                  
; Author  :  Global Software's                  
; Create date  :  13/Oct/2017                  
; Create By  :  ASLAM                  
; Description  :  Stored Procedure for Planning Update from Commando Cloud                
; Change Person  :  ASLAM                
; Last Change Date :  27/Dec/2018 10.00 AM                  
; =============================================   */ 
CREATE Proc  SP_Update_Job(@UserID Int,@DoneDate Date,@ID Int)
AS 
BEGIN
DECLARE @Role Char(1)
DECLARE @OprType Varchar(20)
DECLARE @Ordid int ,@Styleno Varchar(20),@OpCode int,@GrdSlno int,@ItemDescr Varchar(30),@RecCount Int,@ItemSlno int
DECLARE @Sent_Or_Approved Char(10),@Commando_Link Char(5)

SELECT @ORdid = OrdID From WF_WorkFlow_Planning WHERE ID = @ID 
SELECT @Styleno = Styleno From WF_WorkFlow_Planning Where ID = @ID 
SELECT @OpCode = WF_OperationCode From WF_WorkFlow_Planning WHERE ID = @ID 
SELECT @GrdSlno = GrdSlno From WF_WorkFlow_Planning WHERE ID = @ID 
SELECT @ItemDescr = ItemDesc From WF_WorkFlow_Planning WHERE ID = @ID 
SELECT @ItemSlno = ItemSlno From WF_WorkFlow_Planning WHERE ID = @ID 

SELECT @OprType = Type from WF_WorkFlow_Planning A INNER JOIN Wf_OperationMaster B ON A.WF_OperationCode = B.OPCode WHERE A.Id = @ID

SELECT @Role = UserRole from WF_UserMas where Userid =@UserId 
SELECT @Commando_Link = isnull(Commando_Approval_Link,'N') from Options
 

IF @Role = 'C' 
BEGIN
 SELECT @Sent_Or_Approved = Case When (ActualStartDate Is Null And ActualFinishDate IS Null) THEN 'SENT' ELSE 
   CASE WHEN (ActualStartDate Is NOT Null And ActualFinishDate IS Null) THEN 'APPROVED' ELSE 'SENT' END END 
  From WF_WorkFlow_Planning Where ID = @ID 
 
 if @OprType = 'O' 
Begin
	UPDATE WF_WorkFlow_Planning SET ActualStartDate = @DoneDate ,ActualFinishDate = @DoneDate,FinishFlg='Y',VFlag_Start='C',VFlag_Finish='C' 	Where id = @ID
EnD
ELSE
BEGIN
UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = (case when ActualStartDate Is Null  then @DoneDate else ActualstartDate end),
    ActualFinishDate = (case when (ActualStartDate is not Null and ActualFinishDate is null)  then @DoneDate else ActualFinishDate end),
	VFlag_Start = (case when ActualStartDate Is Null  then 'C' else VFlag_Start end),
	VFlag_Finish = (case when (ActualStartDate Is NOT Null AND ActualFinishDate Is Null)  then 'C' else VFlag_Finish end),
	FinishFlg = (case when (ActualStartDate Is NOT Null AND ActualFinishDate Is Null)  then 'Y' else FinishFlg end)
	Where id = @Id
END
if @Commando_Link ='Y'
BEGIN
	SELECT @RecCount = Count(1) From App_ApprovalSent WHERE ORDId = @Ordid And Styleno = @Styleno And ApprovalId = @OpCode And GrdSlno =@GrdSlno
	AND Description=@ItemDescr 
 
	IF  @Sent_Or_Approved='SENT'
	BEGIN
	if @RecCount =0 
	BEGIN
	  Insert into App_ApprovalSent(ORdid,ApprovalId,Grdslno,slno,SentDate,SizeId,Qty,colid,Description,Styleno) VALUES
	   (@Ordid,@OpCode,@GrdSlno,@ItemSlno,@DoneDate,0,0,0,@ItemDescr,@Styleno)

	   	UPDATE App_ApprovalPlan SET SentFlg=1 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END
	ELSE
	BEGIN
		UPDATE App_ApprovalSent SET SentDate=@DoneDate,SizeId=0,Qty=0,ColID=0 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Description =@ItemDescr and GrdSlno =@GrdSlno 

		UPDATE App_ApprovalPlan SET SentFlg=1 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END
	END
	ELSE
	BEGIN
		UPDATE App_ApprovalPlan SET FeedbackDate=@DoneDate WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END

END 
END

ELSE
if @OprType = 'O' 
Begin
	UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = @DoneDate ,
    ActualFinishDate = @DoneDate 
	Where id = @ID
EnD
ELSE
BegiN
UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = (case when ActualStartDate Is Null  then @DoneDate else ActualstartDate end),
    ActualFinishDate = (case when (ActualStartDate is not Null and ActualFinishDate is null)  then @DoneDate else ActualFinishDate end)
	Where id = @ID

 /*
	SELECT @RecCount = Count(1) From App_ApprovalSent WHERE ORDId = @Ordid And Styleno = @Styleno And ApprovalId = @OpCode And GrdSlno =@GrdSlno
	AND Description=@ItemDescr 
	IF  @Sent_Or_Approved='SENT'
	BEGIN
	if @RecCount =0 
	BEGIN
	  Insert into App_ApprovalSent(ORdid,ApprovalId,Grdslno,slno,SentDate,SizeId,Qty,colid,Description,Styleno) VALUES
	   (@Ordid,@OpCode,@GrdSlno,@ItemSlno,@DoneDate,0,0,0,@ItemDescr,@Styleno)
	   	UPDATE App_ApprovalPlan SET SentFlg=1 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END
	ELSE
	BEGIN
		UPDATE App_ApprovalSent SET SentDate=@DoneDate,SizeId=0,Qty=0,ColID=0 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Description =@ItemDescr and GrdSlno =@GrdSlno 

		UPDATE App_ApprovalPlan SET SentFlg=1 WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END
	END
	ELSE
	BEGIN
		UPDATE App_ApprovalPlan SET FeedbackDate=@DoneDate WHERE Ordid =@Ordid And Styleno = @Styleno And ApprovalId=@OpCode 
		And Descr =@ItemDescr and GrdSlno =@GrdSlno 
	END
*/
  END
END 

--Exec  SP_Update_Job 6,'24-Aug-2017',5

/*

ALTER Proc  SP_Update_Job(@UserID Int,@DoneDate Date,@ID Int)
AS 
BEGIN
DECLARE @Role Char(1)
DECLARE @OprType Varchar(20)
SELECT @OprType = Type from WF_WorkFlow_Planning A INNER JOIN Wf_OperationMaster B ON A.WF_OperationCode = B.OPCode WHERE A.Id = @ID

SELECT @Role = UserRole from WF_UserMas where Userid =@UserId 

IF @Role = 'C' 
UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = (case when ActualStartDate Is Null  then @DoneDate else ActualstartDate end),
    ActualFinishDate = (case when (ActualStartDate is not Null and ActualFinishDate is null)  then @DoneDate else ActualFinishDate end),
	VFlag_Start = (case when ActualStartDate Is Null  then 'C' else VFlag_Start end),
	VFlag_Finish = (case when (ActualStartDate Is NOT Null AND ActualFinishDate Is Null)  then 'C' else VFlag_Finish end),
	FinishFlg = (case when (ActualStartDate Is NOT Null AND ActualFinishDate Is Null)  then 'Y' else FinishFlg end)
	Where id = @Id
ELSE
if @OprType = 'O' 
Begin
UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = @DoneDate ,
    ActualFinishDate = @DoneDate 
	Where id = @ID
End
ELSE
Begin
UPDATE WF_WorkFlow_Planning SET 
    ActualStartDate = (case when ActualStartDate Is Null  then @DoneDate else ActualstartDate end),
    ActualFinishDate = (case when (ActualStartDate is not Null and ActualFinishDate is null)  then @DoneDate else ActualFinishDate end)
	Where id = @ID
END
END 


@USerId,@DoneDate,@ID

Exec  SP_Update_Job 6,'24-Aug-2017',5

Update WF_WorkFlow_Planning SET ActualFinishDate = Null,ActualStartDate=Null,VFlag_Start=Null ,VFlag_Finish=null  where id = 5
*/