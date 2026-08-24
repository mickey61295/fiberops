/*;=============================================   
; Author           :  Global Software's    
; Create date      :  27/01/2026    
; Create By        :  ASLAM  
; Description      :  LINT TFR DELETE PROCEDURE
; Change Person    :  ASLAM
; Last Change Date :  29/01/2026 10.20 AM 
; =============================================  */  
CREATE PROCEDURE PROC_Stock_LineTfr_Delete_1 (@ID Int,@StyleNo Varchar(20),@PartId int,@ColId Int,@SizeId Int,@SourceStageID Int,@Pcs Int,@LotNo Varchar(15)) AS  DECLARE @Coycode Int,@Ordid Int,@StageId Int,@GodId Int,@StockQty Int,@FinalStage Char (1),@SeqNo int,@PartyId Int,@PcsStockId Int,@ProcessType Char(1),@RejectionTypeId Int ,@DelType Varchar(30),@FinishedStageID Int,@LotId int    ,@Prod_Without_Lot_Despatch_WithLot as char(1), @LotwiseStockReqd   char(1)   ,@GAN_PCS Char(1)  ,@Knit_Woven_Both_OrderType as char(1), @GAN_RewrkFlg Char(1) ='N', @EmpID INT,@TO_EmpID INT

SELECT @LotwiseStockReqd = isNull(LotwiseStockReqd,'Y') from Options    
SELECT @Prod_Without_Lot_Despatch_WithLot = isNull(Prod_Without_Lot_Despatch_WithLot,'Y') from Options1   
Select @Coycode = Coycode FROM Trs_LineTfr as trs_pcs1 where id=@id     
select @Partyid = 0 from Trs_LineTfr as trs_pcs1 where id=@id      
select @EmpID = IsNull(EmpID,0) from Trs_LineTfr as trs_pcs1 where id=@id      
SELECT @TO_EmpID = IsNUll(TOEMPID,0) from Trs_LineTfr as trs_pcs1 where id=@id  
SELECT @Ordid = OrdJobNo from Trs_LineTfr as trs_pcs1 where id=@id     	  
SELECT @LotwiseStockReqd = isNull(LotwiseStock,'Y') from Ordermas2 where Ordid=@Ordid	  
SELECT @Stageid = TargetStageID from Trs_LineTfr as trs_pcs1 where id=@id     
SELECT @GodId = GodId from Trs_LineTfr as trs_pcs1 where id=@id     
SELECT @ProcessType = 'P' from Trs_LineTfr as trs_pcs1 where id=@id     
SELECT @RejectionTypeId = 0 from Trs_LineTfr as trs_pcs1 where id=@id    
Select @SeqNo = SeqNo From Prod_Sequence Where Prod_Sequence.OrdId=@OrdId And Prod_Sequence.StyleNo=@StyleNo And Prod_Sequence.StageId=@Stageid  
SELECT @DelType = '' from Trs_LineTfr as Trs_Pcs1 Where id =@Id     
SELECT Top 1 @FinishedStageID = -3  
SELECT @GAN_PCS = IsNull(GRNAcceptance_Pcs,'N') from Options
SELECT @Knit_Woven_Both_OrderType = IsNull(Knit_Woven_Both_OrderType,'K') From OrderMas Where ORdid = @Ordid 
if @GAN_PCS ='Y' and @Knit_Woven_Both_OrderType ='W' and @ProcessType ='R'
BEGIN
	SET @GAN_RewrkFlg ='Y'
END
/* SELECT Top 1 @FinishedStageID = StageId  From Pcs_StockTable A INNER JOIN Mas_JobWrkComp B ON A.StageId = B.
ID INNER  JOIN Mas_Dept C ON B.DeptId = C.DeptID INNER JOIN Trs_Pcs1 D ON A.ORdid = D.Ordjobno Where D.ID = @ID And SEMIFINISH='F' */   
BEGIN        
DECLARE LINE_CURSOR CURSOR FOR    
Select Id,StyleNo,Colid,PartId,SizeId,IsNull(lotNo,'') LotNo,Pcs,SourceStageId FROM Trs_LineTfr_Det as Trs_Pcs2 Where ID=@Id And StyleNo=@StyleNo and Colid = @ColId and PartId = @PartId And SizeId =@SizeId and SourceStageId = @SourceStageID and LotNo  =
 @LotNo  
OPEN LINE_CURSOR   
FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId   
WHILE @@FETCH_STATUS = 0          
BEGIN        	  
if ltrim(@LotNo)<>''		
SELECT @LotID = LotSno from mas_Lot where LotName =LTrim(@LotNo) 	
else   
SELECT @LotId = 0   
if Rtrim(@LotwiseStockReqd) ='N' And RTrim(@Prod_Without_Lot_Despatch_WithLot)='Y' 
BEGIN  
	SELECT @LotId = 0  
END 
if @DelType ='Sales'        
BEGIN 
	Select @Partyid = 0  
	SELECT @EmpID = 0
END  
If @PartyId=0  And @EmpId = 0 and (@DelType='Despatch'  OR @delType ='Sales'   )   
Begin       
	if @DelType ='Sales'   
	begin     
		SELECT Top 1 @FinishedStageID = @SourceStageId   
	end   
	else  
	begin   
		SELECT Top 1 @FinishedStageID = -3    
	end
	print 'a1'
	UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineTfr as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.StageId=@FinishedStageID And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 And Pcs_StockTable.LotId = @LotId WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId and Pcs_StockTable.Stageid=@FinishedStageID And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And Trs_Pcs1.Id=@Id And IsNull(Pcs_StockTable.EmpID,0) = 0    
	
End  

If @PartyId<>0  OR @EmpID <>0
Begin  
print 'a2'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty-@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineTfr as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.StageId=Trs_Pcs1.TargetStageId And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId and Pcs_StockTable.Stageid=Trs_Pcs1.TargetStageid And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=@PartyId And Trs_Pcs1.Id=@Id   And Pcs_StockTable.LotId = @LotId  And IsNull(Pcs_StockTable.EmpID,0) = @TO_EmpID

End   
If @SourceStageid<>0 And (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR (Select Rtrim(IsNull(PcsType,'Piece')) From Mas_JobWrkComp Where Id=@StageId)='Bit' Or (@Stageid=@SourceStageid)  
Begin   
If EXISTS (select * from Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = @TO_EmpID)  
BEGIN   
if @DelType<>'Supplier Receipt Rejection' 	 
BEGIN 	 
print 'a3'
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotId = @LotId and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0  And IsNull(Pcs_StockTable.EmpID,0) = @EmpID
IF @GAN_RewrkFlg ='Y'
BEGIN
print 'a4'
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = @EmpID and Pcs_StockTableQty.ColId =@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	 
Begin  
print 'a5'
	 UPDATE Pcs_StockTableQty SET RewrkStk=isNull(Pcs_StockTableQty.RewrkStk,0)+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineTfr as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=0 And Pcs_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id 	  And IsNull(Pcs_StockTable.EmpID,0) = @EmpID

END   
Else 
 Begin  
 if @GAN_RewrkFlg ='N'
 INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	
End 
END 
ELSE 
BEGIN
print 'a6'
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and LotId = @LotId and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = @EmpID and Pcs_StockTableQty.ColId =@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	 
Begin  
print 'a7'
	 UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineTfr as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')=Case When @ProcessType='P' Then 'G' Else 'M' End and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=Case When @ProcessType='P' Then 0 Else @RejectionTypeId End and Partyid=0 And IsNull(Pcs_StockTable.EmpID,0) = @EmpID And Pcs_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id 	  

END   

Else 
 Begin 
 INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End)  	
End 
END	
End  
Else	

Begin /*Supplier Receipt Rejection */ 	/*Insert into tmp_trg Values ('START21')*/ 	
Select @PcsStockId=PcsStockId From Pcs_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @Lotid and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=0  	And IsNull(EmpID,0) = @TO_EmpID
print 'a8'
If EXISTS (select * from Pcs_StockTable Inner Join Pcs_StockTableQty On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo And LotID = @LotID and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=0 And IsNull(Pcs_StockTable.EmpID,0) = @TO_EmpID and Pcs_StockTableQty.ColId=@Colid and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')= 'G' and IsNull(RejectionTypeId,0)=0)  
Begin 
print 'a9'
UPDATE Pcs_StockTableQty SET StockQty=Pcs_StockTableQty.StockQty+@Pcs From Pcs_StockTableQty Inner Join Pcs_StockTable On Pcs_StockTable.PcsStockId=Pcs_StockTableQty.PcsStockId Inner Join Trs_LineTfr as Trs_Pcs1 On Pcs_StockTable.Coycode=Trs_Pcs1.Coycode And Pcs_StockTable.OrdId=Trs_Pcs1.Ordjobno And Pcs_StockTable.GodId=Trs_Pcs1.GodId And Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId And Pcs_StockTableQty.ColId=@ColId And Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 WHERE Pcs_StockTable.coycode=Trs_Pcs1.Coycode And Pcs_StockTable.Ordid=Trs_Pcs1.Ordjobno and Pcs_StockTable.StyleNo=@StyleNo And Pcs_StockTable.LotId = @LotId And Pcs_StockTable.PartId=@PartId and Pcs_StockTable.GodId=Trs_Pcs1.GodId and Pcs_StockTableQty.Colid=@ColId and Pcs_StockTableQty.SizeId=@SizeId and IsNull(GoodPcsFlag,'G')='G' and IsNull(Pcs_StockTableQty.RejectionTypeId,0)=0 and Partyid=0 And IsNull(Pcs_StockTable.EmpID,0) = @TO_EmpID And Pcs_StockTable.StageId=@SourceStageId And Trs_Pcs1.Id=@Id  

End  

Else  
Begin  /*Insert into tmp_trg Values ('START41')*/ 	 
INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End) 
End 
End 
End 
Else 
Begin  /*Insert into tmp_trg Values ('START5')*/ 
Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Pcs_StockTable  
INSERT INTO Pcs_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId,LotID,EmpID) VALUES (@Coycode,@Ordid,@StyleNo,@Stageid,@PartId,@SeqNo,@GodId,@PcsStockId,0,@LotID,@EmpID) INSERT INTO Pcs_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When @ProcessType='P' Then 'G' Else 'M' End,Case When @ProcessType='P' Then 0 Else @RejectionTypeId End) 
End  
End   
FETCH NEXT FROM LINE_CURSOR INTO @Id,@StyleNo,@Colid,@PartId,@SizeId,@LotNo,@Pcs,@SourceStageId   
END   
CLOSE LINE_CURSOR    
DEALLOCATE LINE_CURSOR   
SET NOCOUNT OFF  
END 
